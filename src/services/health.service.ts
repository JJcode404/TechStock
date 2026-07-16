/**
 * Health & metrics service. Reports process/runtime info and verifies the DB
 * connection with a lightweight query.
 */
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';
import { APP } from '../constants/index.js';

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: { database: 'up' | 'down' };
}

export interface MetricsReport {
  uptimeSeconds: number;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  pid: number;
  nodeVersion: string;
  counts: Record<string, number>;
}

export class HealthService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  async check(): Promise<HealthReport> {
    let database: 'up' | 'down' = 'up';
    try {
      await this.db.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: APP.NAME,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: { database },
    };
  }

  async metrics(): Promise<MetricsReport> {
    const [users, products, sales, lowStock] = await Promise.all([
      this.db.user.count({ where: { isDeleted: false } }),
      this.db.product.count({ where: { isDeleted: false } }),
      this.db.sale.count({ where: { isDeleted: false } }),
      this.db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM products
        WHERE "isDeleted" = false AND "currentStock" <= "minStock"`,
    ]);

    return {
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      nodeVersion: process.version,
      counts: {
        users,
        products,
        sales,
        lowStockProducts: Number(lowStock[0]?.count ?? 0),
      },
    };
  }
}

export const healthService = new HealthService();
