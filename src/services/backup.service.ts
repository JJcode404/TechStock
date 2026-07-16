/**
 * Database backup service.
 *
 * Shells out to `pg_dump` (must be on PATH) to produce a compressed logical
 * backup into BACKUP_DIR. Returns metadata about the created file. Admin-only.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import { AppError } from '../errors/index.js';
import { HTTP_STATUS } from '../constants/index.js';

const log = createLogger('backup');

export interface BackupMeta {
  file: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
}

export class BackupService {
  private readonly dir = path.resolve(process.cwd(), env.BACKUP_DIR);

  private ensureDir(): void {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  /**
   * pg_dump uses libpq URIs, which don't understand Prisma-specific query params
   * such as `schema`, `connection_limit` or `pgbouncer`. Strip them so the
   * connection string is a valid libpq URI.
   */
  private pgConnectionString(): string {
    try {
      const url = new URL(env.DATABASE_URL);
      ['schema', 'connection_limit', 'pgbouncer', 'pool_timeout', 'sslmode'].forEach((p) =>
        url.searchParams.delete(p),
      );
      return url.toString();
    } catch {
      return env.DATABASE_URL;
    }
  }

  async create(): Promise<BackupMeta> {
    this.ensureDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `techstock-${stamp}.dump`;
    const filePath = path.join(this.dir, fileName);
    const connectionString = this.pgConnectionString();

    try {
      await new Promise<void>((resolve, reject) => {
        // -Fc = custom compressed format, restore with pg_restore.
        const child = spawn('pg_dump', ['--dbname', connectionString, '-Fc', '-f', filePath], {
          stdio: ['ignore', 'ignore', 'pipe'],
        });
        let stderr = '';
        child.stderr.on('data', (d) => (stderr += d.toString()));
        child.on('error', (err) =>
          reject(
            new AppError(`pg_dump failed to start (is it installed?): ${err.message}`, HTTP_STATUS.SERVICE_UNAVAILABLE),
          ),
        );
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new AppError(`pg_dump exited with code ${code}: ${stderr}`, HTTP_STATUS.INTERNAL_SERVER_ERROR));
        });
      });
    } catch (err) {
      // Remove any partial/empty file left behind on failure.
      if (existsSync(filePath)) rmSync(filePath, { force: true });
      throw err;
    }

    const size = statSync(filePath).size;
    log.info({ file: fileName, sizeBytes: size }, 'Database backup created');
    return { file: fileName, path: filePath, sizeBytes: size, createdAt: new Date().toISOString() };
  }

  list(): BackupMeta[] {
    this.ensureDir();
    return readdirSync(this.dir)
      .filter((f) => f.endsWith('.dump'))
      .map((f) => {
        const full = path.join(this.dir, f);
        const s = statSync(full);
        return { file: f, path: full, sizeBytes: s.size, createdAt: s.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const backupService = new BackupService();
