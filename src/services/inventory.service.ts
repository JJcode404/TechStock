/**
 * Inventory service.
 *
 * The heart of stock control is `applyStockMovement` — a transaction-safe
 * primitive that atomically adjusts a product's stock and records an immutable
 * StockMovement row. Sales, purchases, returns, damages and manual adjustments
 * ALL flow through it, so the movement ledger is always the source of truth and
 * `products.currentStock` can be reconstructed from it.
 */
import { Prisma, type InventoryAdjustment, type StockMovement } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import type { RequestContext } from '../types/index.js';
import { InsufficientStockError, NotFoundError } from '../errors/index.js';
import { buildAdjustmentReference } from '../utils/generators.js';
import { resolvePagination } from '../utils/pagination.js';
import { buildPaginationMeta, type PaginationMeta } from '../utils/apiResponse.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import type { CreateAdjustmentInput, ListMovementQuery } from '../validators/inventory.validator.js';

export interface StockMovementParams {
  productId: string;
  type: Prisma.StockMovementCreateInput['type'];
  /** Signed change: negative reduces stock, positive increases it. */
  quantity: number;
  unitCost?: Prisma.Decimal | number | null;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  createdById?: string | null;
  deviceId?: string | null;
  /** When false (default) a resulting negative stock throws InsufficientStock. */
  allowNegative?: boolean;
}

/**
 * Apply a stock movement within an existing transaction. The row-level
 * increment is atomic, preventing lost updates under concurrency; a resulting
 * negative balance rolls the whole transaction back.
 */
export const applyStockMovement = async (
  tx: Prisma.TransactionClient,
  params: StockMovementParams,
): Promise<StockMovement> => {
  const product = await tx.product.findUnique({
    where: { id: params.productId },
    select: { id: true, name: true, currentStock: true },
  });
  if (!product) throw new NotFoundError('Product');

  const stockBefore = product.currentStock;
  const stockAfter = stockBefore + params.quantity;

  if (stockAfter < 0 && !params.allowNegative) {
    throw new InsufficientStockError(product.name, stockBefore, Math.abs(params.quantity));
  }

  await tx.product.update({
    where: { id: params.productId },
    data: { currentStock: { increment: params.quantity }, syncVersion: { increment: 1 } },
  });

  return tx.stockMovement.create({
    data: {
      productId: params.productId,
      type: params.type,
      quantity: params.quantity,
      stockBefore,
      stockAfter,
      unitCost:
        params.unitCost === undefined || params.unitCost === null
          ? null
          : new Prisma.Decimal(params.unitCost),
      reason: params.reason ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      createdById: params.createdById ?? null,
      deviceId: params.deviceId ?? null,
    },
  });
};

export class InventoryService {
  constructor(private readonly audit: ActivityLogService = activityLogService) {}

  /** Manual stock adjustment to an absolute new quantity (e.g. stock count). */
  async createAdjustment(
    input: CreateAdjustmentInput,
    userId: string,
    ctx: RequestContext,
  ): Promise<InventoryAdjustment> {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: input.productId, isDeleted: false },
        select: { id: true, currentStock: true },
      });
      if (!product) throw new NotFoundError('Product');

      const quantityBefore = product.currentStock;
      const quantityAfter = input.newQuantity;
      const delta = quantityAfter - quantityBefore;

      // Sequence for the human-readable reference (per day).
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const todayCount = await tx.inventoryAdjustment.count({
        where: { createdAt: { gte: startOfDay } },
      });
      const reference = buildAdjustmentReference(todayCount + 1);

      if (delta !== 0) {
        await applyStockMovement(tx, {
          productId: input.productId,
          type: 'ADJUSTMENT',
          quantity: delta,
          reason: `${input.reason}: ${input.notes ?? 'manual adjustment'}`,
          referenceType: 'InventoryAdjustment',
          referenceId: reference,
          createdById: userId,
          deviceId: ctx.deviceId ?? null,
          allowNegative: true, // corrections may set any absolute value
        });
      }

      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          productId: input.productId,
          reason: input.reason,
          reference,
          quantityBefore,
          quantityAfter,
          delta,
          notes: input.notes ?? null,
          adjustedById: userId,
          deviceId: ctx.deviceId ?? null,
        },
      });

      await this.audit.recordTx(tx, {
        userId,
        action: 'inventory.adjust',
        entity: 'InventoryAdjustment',
        entityId: adjustment.id,
        metadata: { productId: input.productId, delta },
        ipAddress: ctx.ipAddress,
      });

      return adjustment;
    });
  }

  async listMovements(
    query: ListMovementQuery,
  ): Promise<{ data: StockMovement[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.StockMovementWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true, sku: true } } },
      }),
      prisma.stockMovement.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async listAdjustments(
    query: { page?: number; pageSize?: number; productId?: string },
  ): Promise<{ data: InventoryAdjustment[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.InventoryAdjustmentWhereInput = {
      isDeleted: false,
      ...(query.productId ? { productId: query.productId } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.inventoryAdjustment.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true, sku: true } } },
      }),
      prisma.inventoryAdjustment.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async getStockValue(): Promise<{ retailValue: string; costValue: string; totalUnits: number }> {
    const result = await prisma.$queryRaw<{ retail: string; cost: string; units: bigint }[]>`
      SELECT
        COALESCE(SUM("currentStock" * "sellingPrice"), 0)::text AS retail,
        COALESCE(SUM("currentStock" * "buyingPrice"), 0)::text AS cost,
        COALESCE(SUM("currentStock"), 0)::bigint AS units
      FROM products WHERE "isDeleted" = false`;
    const row = result[0];
    return {
      retailValue: row?.retail ?? '0',
      costValue: row?.cost ?? '0',
      totalUnits: Number(row?.units ?? 0),
    };
  }
}

export const inventoryService = new InventoryService();
