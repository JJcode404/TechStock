/**
 * Purchase order service.
 *
 * Lifecycle: DRAFT -> ORDERED -> PARTIALLY_RECEIVED -> RECEIVED (or CANCELLED).
 * Receiving a PO increases inventory via the stock-movement primitive, updates
 * received quantities, optionally refreshes the product's cost price, and grows
 * the supplier's outstanding balance by the amount still owed.
 */
import { Prisma, type PurchaseOrder } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import type { RequestContext } from '../types/index.js';
import { applyStockMovement } from './inventory.service.js';
import {
  PurchaseRepository,
  purchaseRepository,
  type PurchaseOrderFull,
} from '../repositories/purchase.repository.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/index.js';
import { buildOrderNumber } from '../utils/generators.js';
import { round2, taxAmount, ZERO } from '../utils/money.js';
import { resolvePagination, buildOrderBy } from '../utils/pagination.js';
import { buildPaginationMeta, type PaginationMeta } from '../utils/apiResponse.js';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrderQuery,
  ReceivePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from '../validators/purchase.validator.js';

const SORTABLE = ['createdAt', 'total', 'status'];

interface ComputedTotals {
  subtotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  lines: {
    productId: string;
    quantity: number;
    unitCost: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }[];
}

export class PurchaseService {
  constructor(
    private readonly repo: PurchaseRepository = purchaseRepository,
    private readonly audit: ActivityLogService = activityLogService,
  ) {}

  private computeTotals(
    items: CreatePurchaseOrderInput['items'],
  ): ComputedTotals {
    let subtotal = ZERO;
    let taxTotal = ZERO;
    const lines = items.map((item) => {
      const unitCost = new Prisma.Decimal(item.unitCost);
      const taxRate = new Prisma.Decimal(item.taxRate);
      const net = round2(unitCost.mul(item.quantity));
      const tax = taxAmount(net, taxRate);
      subtotal = subtotal.add(net);
      taxTotal = taxTotal.add(tax);
      return { productId: item.productId, quantity: item.quantity, unitCost, taxRate, lineTotal: round2(net.add(tax)) };
    });
    return { subtotal: round2(subtotal), taxTotal: round2(taxTotal), total: round2(subtotal.add(taxTotal)), lines };
  }

  private async assertProductsExist(ids: string[]): Promise<void> {
    const found = await prisma.product.count({ where: { id: { in: ids }, isDeleted: false } });
    if (found !== new Set(ids).size) throw new BadRequestError('One or more products do not exist');
  }

  async create(
    input: CreatePurchaseOrderInput,
    userId: string,
    ctx: RequestContext,
  ): Promise<PurchaseOrderFull> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, isDeleted: false },
      select: { id: true },
    });
    if (!supplier) throw new BadRequestError('Supplier does not exist');
    await this.assertProductsExist(input.items.map((i) => i.productId));

    const totals = this.computeTotals(input.items);

    const poId = await prisma.$transaction(async (tx) => {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const seq = (await this.repo.countSince(tx, startOfDay)) + 1;
      const orderNumber = buildOrderNumber(seq);

      const po = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: input.supplierId,
          status: input.submit ? 'ORDERED' : 'DRAFT',
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          notes: input.notes ?? null,
          expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
          createdById: userId,
          deviceId: ctx.deviceId ?? null,
          items: {
            create: totals.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitCost: l.unitCost,
              taxRate: l.taxRate,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      await this.audit.recordTx(tx, {
        userId,
        action: 'purchase.create',
        entity: 'PurchaseOrder',
        entityId: po.id,
        metadata: { orderNumber, total: totals.total.toString() },
        ipAddress: ctx.ipAddress,
      });
      return po.id;
    });

    return (await this.repo.findById(poId)) as PurchaseOrderFull;
  }

  async getById(id: string): Promise<PurchaseOrderFull> {
    const po = await this.repo.findById(id);
    if (!po) throw new NotFoundError('Purchase order');
    return po;
  }

  async list(
    query: ListPurchaseOrderQuery,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.PurchaseOrderWhereInput = {
      isDeleted: false,
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const orderBy = buildOrderBy(pagination, SORTABLE, 'createdAt');
    const [data, total] = await this.repo.list(where, pagination.skip, pagination.take, orderBy);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async update(
    id: string,
    input: UpdatePurchaseOrderInput,
    userId: string,
    ctx: RequestContext,
  ): Promise<PurchaseOrderFull> {
    const po = await this.getById(id);
    if (po.status !== 'DRAFT') {
      throw new ConflictError('Only DRAFT purchase orders can be edited');
    }

    await prisma.$transaction(async (tx) => {
      const data: Prisma.PurchaseOrderUpdateInput = {
        notes: input.notes ?? undefined,
        expectedAt: input.expectedAt ? new Date(input.expectedAt) : undefined,
        deviceId: ctx.deviceId ?? undefined,
        syncVersion: { increment: 1 },
      };

      if (input.items) {
        await this.assertProductsExist(input.items.map((i) => i.productId));
        const totals = this.computeTotals(input.items);
        data.subtotal = totals.subtotal;
        data.taxTotal = totals.taxTotal;
        data.total = totals.total;
        // Replace line items wholesale (DRAFT only, so safe).
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        data.items = {
          create: totals.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitCost: l.unitCost,
            taxRate: l.taxRate,
            lineTotal: l.lineTotal,
          })),
        };
      }

      await tx.purchaseOrder.update({ where: { id }, data });
      await this.audit.recordTx(tx, {
        userId,
        action: 'purchase.update',
        entity: 'PurchaseOrder',
        entityId: id,
        ipAddress: ctx.ipAddress,
      });
    });

    return (await this.repo.findById(id)) as PurchaseOrderFull;
  }

  async receive(
    id: string,
    input: ReceivePurchaseOrderInput,
    userId: string,
    ctx: RequestContext,
  ): Promise<PurchaseOrderFull> {
    await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id, isDeleted: false },
        include: { items: true },
      });
      if (!po) throw new NotFoundError('Purchase order');
      if (po.status === 'CANCELLED' || po.status === 'RECEIVED') {
        throw new ConflictError(`Cannot receive a ${po.status} purchase order`);
      }

      const itemMap = new Map(po.items.map((i) => [i.id, i]));

      for (const rec of input.items) {
        const item = itemMap.get(rec.itemId);
        if (!item) throw new BadRequestError(`Item ${rec.itemId} is not part of this order`);
        const outstanding = item.quantity - item.receivedQuantity;
        if (rec.receivedQuantity > outstanding) {
          throw new BadRequestError(
            `Cannot receive ${rec.receivedQuantity}; only ${outstanding} outstanding for this line`,
          );
        }

        await applyStockMovement(tx, {
          productId: item.productId,
          type: 'PURCHASE',
          quantity: rec.receivedQuantity,
          unitCost: item.unitCost,
          reason: `Receive PO ${po.orderNumber}`,
          referenceType: 'PurchaseOrder',
          referenceId: po.id,
          createdById: userId,
          deviceId: ctx.deviceId ?? null,
        });

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQuantity: { increment: rec.receivedQuantity } },
        });

        if (input.updateCostPrice) {
          await tx.product.update({
            where: { id: item.productId },
            data: { buyingPrice: item.unitCost, syncVersion: { increment: 1 } },
          });
        }
      }

      // Recompute status from fresh received quantities.
      const refreshed = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
      const fully = refreshed.every((i) => i.receivedQuantity >= i.quantity);
      const partially = refreshed.some((i) => i.receivedQuantity > 0);
      const status = fully ? 'RECEIVED' : partially ? 'PARTIALLY_RECEIVED' : po.status;

      const amountPaid = round2(po.amountPaid.add(new Prisma.Decimal(input.amountPaid)));
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status,
          amountPaid,
          receivedAt: fully ? new Date() : po.receivedAt,
          syncVersion: { increment: 1 },
        },
      });

      // Grow supplier's outstanding balance by amount still owed on this receipt.
      const owed = round2(po.total.sub(amountPaid));
      if (owed.gt(ZERO)) {
        await tx.supplier.update({
          where: { id: po.supplierId },
          data: { outstandingBalance: { increment: owed }, syncVersion: { increment: 1 } },
        });
      }

      await this.audit.recordTx(tx, {
        userId,
        action: 'purchase.receive',
        entity: 'PurchaseOrder',
        entityId: po.id,
        metadata: { orderNumber: po.orderNumber, status },
        ipAddress: ctx.ipAddress,
      });
    });

    return (await this.repo.findById(id)) as PurchaseOrderFull;
  }

  async cancel(id: string, userId: string, ctx: RequestContext): Promise<PurchaseOrder> {
    const po = await this.getById(id);
    if (po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED') {
      throw new ConflictError('Cannot cancel a partially/fully received order');
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED', syncVersion: { increment: 1 }, deviceId: ctx.deviceId ?? undefined },
    });
    this.audit.record({
      userId,
      action: 'purchase.cancel',
      entity: 'PurchaseOrder',
      entityId: id,
      ipAddress: ctx.ipAddress,
    });
    return updated;
  }
}

export const purchaseService = new PurchaseService();
