/**
 * Offline-first synchronization service.
 *
 * PULL: returns every record (including soft-deleted tombstones) changed since a
 *       client-supplied watermark, per requested entity, plus a fresh server
 *       timestamp the client stores as its next watermark.
 *
 * PUSH: applies client changes to master-data entities using last-write-wins
 *       conflict resolution keyed on `updatedAt`. If the server copy is newer,
 *       the client's change is rejected and the server version is returned so
 *       the client can reconcile.
 */
import { prisma } from '../database/prisma.js';
import { createLogger } from '../config/logger.js';
import type { PullQuery, PushBody, PushChange } from '../validators/sync.validator.js';

const log = createLogger('sync');

// Map entity name -> Prisma model delegate. Kept as a lookup so pull/push stay generic.
type Delegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: unknown) => Promise<{ updatedAt: Date } | null>;
  update: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
};

const delegates = (): Record<string, Delegate> => ({
  products: prisma.product as unknown as Delegate,
  categories: prisma.category as unknown as Delegate,
  customers: prisma.customer as unknown as Delegate,
  suppliers: prisma.supplier as unknown as Delegate,
  sales: prisma.sale as unknown as Delegate,
  stockMovements: prisma.stockMovement as unknown as Delegate,
  settings: prisma.setting as unknown as Delegate,
});

// Fields a client is never allowed to set directly on push.
const PROTECTED_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'syncVersion',
  'currentStock', // stock only moves via inventory movements
  'outstandingBalance', // balances only move via sales/purchases
  'loyaltyPoints',
  'passwordHash',
]);

export interface PushResult {
  applied: { entity: string; id: string }[];
  conflicts: { entity: string; id: string; reason: string; server: unknown }[];
  rejected: { entity: string; id: string; reason: string }[];
}

export class SyncService {
  async pull(query: PullQuery): Promise<Record<string, unknown>> {
    const since = query.since ? new Date(query.since) : new Date(0);
    const models = delegates();
    const serverTime = new Date().toISOString();
    const result: Record<string, unknown[]> = {};

    for (const entity of query.entities) {
      const delegate = models[entity];
      if (!delegate) continue;
      // stockMovements has no updatedAt-driven soft delete; use createdAt for it.
      const orderField = entity === 'stockMovements' ? 'createdAt' : 'updatedAt';
      const where =
        entity === 'stockMovements'
          ? { createdAt: { gt: since } }
          : { updatedAt: { gt: since } };
      result[entity] = await delegate.findMany({
        where,
        orderBy: { [orderField]: 'asc' },
        take: query.limit,
      });
    }

    return { serverTime, since: since.toISOString(), data: result };
  }

  async push(body: PushBody): Promise<PushResult> {
    const models = delegates();
    const out: PushResult = { applied: [], conflicts: [], rejected: [] };

    for (const change of body.changes) {
      const delegate = models[change.entity];
      if (!delegate) {
        out.rejected.push({ entity: change.entity, id: change.id, reason: 'Unknown entity' });
        continue;
      }
      try {
        await this.applyChange(delegate, change, body.deviceId, out);
      } catch (err) {
        log.warn({ err, change: { entity: change.entity, id: change.id } }, 'Push change failed');
        out.rejected.push({
          entity: change.entity,
          id: change.id,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return out;
  }

  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!PROTECTED_FIELDS.has(key)) clean[key] = value;
    }
    return clean;
  }

  private async applyChange(
    delegate: Delegate,
    change: PushChange,
    deviceId: string,
    out: PushResult,
  ): Promise<void> {
    const incomingUpdatedAt = new Date(change.updatedAt);
    const existing = await delegate.findUnique({ where: { id: change.id } });
    const payload = this.sanitize(change.data);

    if (!existing) {
      // New record originating offline — create with the client's id.
      await delegate.create({
        data: {
          ...payload,
          id: change.id,
          deviceId,
          isDeleted: change.isDeleted,
          syncVersion: 1,
        },
      });
      out.applied.push({ entity: change.entity, id: change.id });
      return;
    }

    // Last-write-wins: server copy newer or equal -> conflict, keep server.
    if (existing.updatedAt.getTime() >= incomingUpdatedAt.getTime()) {
      out.conflicts.push({
        entity: change.entity,
        id: change.id,
        reason: 'Server version is newer or equal (last-write-wins)',
        server: existing,
      });
      return;
    }

    await delegate.update({
      where: { id: change.id },
      data: {
        ...payload,
        deviceId,
        isDeleted: change.isDeleted,
        ...(change.isDeleted ? { deletedAt: new Date() } : {}),
        syncVersion: { increment: 1 },
      },
    });
    out.applied.push({ entity: change.entity, id: change.id });
  }
}

export const syncService = new SyncService();
