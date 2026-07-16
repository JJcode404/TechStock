/**
 * Audit logging service. Writes an entry to activity_logs for security-relevant
 * and business-relevant actions. Failures are swallowed (best-effort) so audit
 * logging never breaks the primary operation, but they are logged.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';
import { logger } from '../config/logger.js';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class ActivityLogService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Fire-and-forget audit write. Never throws. */
  record(entry: AuditEntry): void {
    void this.db.activityLog
      .create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          metadata: entry.metadata ?? undefined,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      })
      .catch((err) => logger.warn({ err, action: entry.action }, 'Failed to write activity log'));
  }

  /** Transactional audit write for when the log must be part of a transaction. */
  async recordTx(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    await tx.activityLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ?? undefined,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  }
}

export const activityLogService = new ActivityLogService();
