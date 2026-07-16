/**
 * Sales / POS service.
 *
 * Every sale is created inside a single transaction that:
 *   1. Validates & prices each line (with COGS snapshot for profit reporting).
 *   2. Deducts stock via the inventory primitive (fails on insufficient stock).
 *   3. Persists the sale, its items and payments.
 *   4. Updates customer credit balance & loyalty points.
 * Cancel and return operations reverse stock and balances symmetrically.
 */
import { Prisma, type Sale } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import type { RequestContext } from '../types/index.js';
import { applyStockMovement } from './inventory.service.js';
import { SaleRepository, saleRepository, type SaleFull } from '../repositories/sale.repository.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/index.js';
import { buildReceiptNumber, buildInvoiceNumber } from '../utils/generators.js';
import { round2, taxAmount, ZERO } from '../utils/money.js';
import { resolvePagination, buildOrderBy } from '../utils/pagination.js';
import { buildPaginationMeta, type PaginationMeta } from '../utils/apiResponse.js';
import type {
  CancelSaleInput,
  CreateSaleInput,
  ListSaleQuery,
  ReturnSaleInput,
} from '../validators/sale.validator.js';

const SORTABLE = ['soldAt', 'total', 'createdAt'];
const LOYALTY_POINTS_PER_CURRENCY = 0.01; // 1 point per 100 spent

interface PricedLine {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  discount: Prisma.Decimal;
  lineNet: Prisma.Decimal; // after discount, before tax
  lineTax: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

export class SaleService {
  constructor(
    private readonly repo: SaleRepository = saleRepository,
    private readonly audit: ActivityLogService = activityLogService,
  ) {}

  async create(input: CreateSaleInput, cashierId: string, ctx: RequestContext): Promise<SaleFull> {
    // Reject duplicate product lines to keep stock math unambiguous.
    const ids = input.items.map((i) => i.productId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestError('Duplicate products in items; combine quantities instead');
    }

    const saleId = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: ids }, isDeleted: false },
        select: {
          id: true,
          name: true,
          sku: true,
          sellingPrice: true,
          wholesalePrice: true,
          dealerPrice: true,
          buyingPrice: true,
          taxRate: true,
        },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const lines: PricedLine[] = input.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new BadRequestError(`Product ${item.productId} not found or inactive`);

        const tierPrice =
          item.priceTier === 'WHOLESALE'
            ? product.wholesalePrice
            : item.priceTier === 'DEALER'
              ? product.dealerPrice
              : product.sellingPrice;
        const unitPrice =
          item.unitPrice !== undefined ? new Prisma.Decimal(item.unitPrice) : tierPrice;

        const gross = round2(unitPrice.mul(item.quantity));
        const discount = round2(new Prisma.Decimal(item.discount));
        if (discount.gt(gross)) throw new BadRequestError('Discount cannot exceed line total');
        const lineNet = round2(gross.sub(discount));
        const lineTax = taxAmount(lineNet, product.taxRate);
        const lineTotal = round2(lineNet.add(lineTax));

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice,
          unitCost: product.buyingPrice,
          taxRate: product.taxRate,
          discount,
          lineNet,
          lineTax,
          lineTotal,
        };
      });

      const subtotal = round2(lines.reduce((a, l) => a.add(l.lineNet), ZERO));
      const taxTotal = round2(lines.reduce((a, l) => a.add(l.lineTax), ZERO));
      const discountTotal = round2(lines.reduce((a, l) => a.add(l.discount), ZERO));
      const total = round2(subtotal.add(taxTotal));
      const costTotal = round2(lines.reduce((a, l) => a.add(l.unitCost.mul(l.quantity)), ZERO));
      const amountPaid = round2(
        input.payments.reduce((a, p) => a.add(new Prisma.Decimal(p.amount)), ZERO),
      );

      const isCredit = input.payments.some((p) => p.method === 'CREDIT');
      const paymentStatus = amountPaid.gte(total)
        ? 'PAID'
        : amountPaid.lte(ZERO)
          ? 'UNPAID'
          : 'PARTIAL';
      const changeDue =
        amountPaid.gt(total) && !isCredit ? round2(amountPaid.sub(total)) : ZERO;

      if (input.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, isDeleted: false },
          select: { id: true },
        });
        if (!customer) throw new BadRequestError('Customer not found');
      } else if (paymentStatus !== 'PAID') {
        throw new BadRequestError('Credit/partial sales require a customer');
      }

      // Daily receipt/invoice sequence.
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const seq = (await this.repo.countSince(tx, startOfDay)) + 1;
      const receiptNumber = buildReceiptNumber(seq);
      const invoiceNumber = input.generateInvoice ? buildInvoiceNumber(seq) : null;

      const sale = await tx.sale.create({
        data: {
          receiptNumber,
          invoiceNumber,
          status: 'COMPLETED',
          paymentStatus,
          subtotal,
          taxTotal,
          discountTotal,
          total,
          amountPaid,
          changeDue,
          costTotal,
          customerId: input.customerId ?? null,
          cashierId,
          notes: input.notes ?? null,
          deviceId: ctx.deviceId ?? null,
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              sku: l.sku,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              taxRate: l.taxRate,
              discount: l.discount,
              lineTotal: l.lineTotal,
            })),
          },
          payments: {
            create: input.payments.map((p) => ({
              method: p.method,
              amount: new Prisma.Decimal(p.amount),
              reference: p.reference ?? null,
              deviceId: ctx.deviceId ?? null,
            })),
          },
        },
      });

      // Deduct stock for each line (throws on insufficient stock -> rollback).
      for (const line of lines) {
        await applyStockMovement(tx, {
          productId: line.productId,
          type: 'SALE',
          quantity: -line.quantity,
          unitCost: line.unitCost,
          reason: `Sale ${receiptNumber}`,
          referenceType: 'Sale',
          referenceId: sale.id,
          createdById: cashierId,
          deviceId: ctx.deviceId ?? null,
        });
      }

      // Customer credit balance + loyalty points.
      if (input.customerId) {
        const outstanding = round2(total.sub(amountPaid));
        const loyalty = Math.floor(total.toNumber() * LOYALTY_POINTS_PER_CURRENCY);
        await tx.customer.update({
          where: { id: input.customerId },
          data: {
            outstandingBalance: outstanding.gt(ZERO)
              ? { increment: outstanding }
              : undefined,
            loyaltyPoints: loyalty > 0 ? { increment: loyalty } : undefined,
            syncVersion: { increment: 1 },
          },
        });
      }

      await this.audit.recordTx(tx, {
        userId: cashierId,
        action: 'sale.create',
        entity: 'Sale',
        entityId: sale.id,
        metadata: { receiptNumber, total: total.toString(), items: lines.length },
        ipAddress: ctx.ipAddress,
      });

      return sale.id;
    });

    return (await this.repo.findById(saleId)) as SaleFull;
  }

  async getById(id: string): Promise<SaleFull> {
    const sale = await this.repo.findById(id);
    if (!sale) throw new NotFoundError('Sale');
    return sale;
  }

  async getReceipt(id: string): Promise<Record<string, unknown>> {
    const sale = await this.getById(id);
    return {
      receiptNumber: sale.receiptNumber,
      invoiceNumber: sale.invoiceNumber,
      soldAt: sale.soldAt,
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      cashier: sale.cashier,
      customer: sale.customer,
      items: sale.items.map((i) => ({
        name: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice.toString(),
        discount: i.discount.toString(),
        lineTotal: i.lineTotal.toString(),
      })),
      totals: {
        subtotal: sale.subtotal.toString(),
        tax: sale.taxTotal.toString(),
        discount: sale.discountTotal.toString(),
        total: sale.total.toString(),
        amountPaid: sale.amountPaid.toString(),
        changeDue: sale.changeDue.toString(),
      },
      payments: sale.payments.map((p) => ({
        method: p.method,
        amount: p.amount.toString(),
        reference: p.reference,
      })),
    };
  }

  async list(query: ListSaleQuery): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.SaleWhereInput = {
      isDeleted: false,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.cashierId ? { cashierId: query.cashierId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            soldAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const orderBy = buildOrderBy(pagination, SORTABLE, 'soldAt');
    const [data, total] = await this.repo.list(where, pagination.skip, pagination.take, orderBy);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async cancel(id: string, input: CancelSaleInput, userId: string, ctx: RequestContext): Promise<Sale> {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id, isDeleted: false },
        include: { items: true },
      });
      if (!sale) throw new NotFoundError('Sale');
      if (sale.status !== 'COMPLETED') {
        throw new ConflictError(`Only COMPLETED sales can be cancelled (current: ${sale.status})`);
      }

      // Restock every item.
      for (const item of sale.items) {
        await applyStockMovement(tx, {
          productId: item.productId,
          type: 'RETURN',
          quantity: item.quantity - item.returnedQuantity,
          reason: `Cancel sale ${sale.receiptNumber}: ${input.reason ?? 'n/a'}`,
          referenceType: 'Sale',
          referenceId: sale.id,
          createdById: userId,
          deviceId: ctx.deviceId ?? null,
          allowNegative: true,
        });
      }

      // Reverse customer balance & loyalty.
      if (sale.customerId) {
        const outstanding = round2(sale.total.sub(sale.amountPaid));
        const loyalty = Math.floor(sale.total.toNumber() * LOYALTY_POINTS_PER_CURRENCY);
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            outstandingBalance: outstanding.gt(ZERO) ? { decrement: outstanding } : undefined,
            loyaltyPoints: loyalty > 0 ? { decrement: loyalty } : undefined,
            syncVersion: { increment: 1 },
          },
        });
      }

      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          notes: input.reason ? `${sale.notes ?? ''}\nCancelled: ${input.reason}`.trim() : sale.notes,
          syncVersion: { increment: 1 },
        },
      });

      await this.audit.recordTx(tx, {
        userId,
        action: 'sale.cancel',
        entity: 'Sale',
        entityId: sale.id,
        metadata: { receiptNumber: sale.receiptNumber },
        ipAddress: ctx.ipAddress,
      });

      return updated;
    });
  }

  async return(id: string, input: ReturnSaleInput, userId: string, ctx: RequestContext): Promise<SaleFull> {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id, isDeleted: false },
        include: { items: true },
      });
      if (!sale) throw new NotFoundError('Sale');
      if (sale.status === 'CANCELLED') throw new ConflictError('Cannot return a cancelled sale');

      const itemMap = new Map(sale.items.map((i) => [i.id, i]));
      let refundTotal = ZERO;

      for (const ret of input.items) {
        const item = itemMap.get(ret.saleItemId);
        if (!item) throw new BadRequestError(`Sale item ${ret.saleItemId} not in this sale`);
        const remaining = item.quantity - item.returnedQuantity;
        if (ret.quantity > remaining) {
          throw new BadRequestError(
            `Cannot return ${ret.quantity} of "${item.productName}"; only ${remaining} remaining`,
          );
        }

        // Per-unit value (net + tax) refunded proportionally.
        const perUnit = round2(item.lineTotal.div(item.quantity));
        refundTotal = refundTotal.add(round2(perUnit.mul(ret.quantity)));

        await tx.saleItem.update({
          where: { id: item.id },
          data: { returnedQuantity: { increment: ret.quantity } },
        });

        if (input.restock) {
          await applyStockMovement(tx, {
            productId: item.productId,
            type: 'RETURN',
            quantity: ret.quantity,
            reason: `Return sale ${sale.receiptNumber}: ${input.reason ?? 'n/a'}`,
            referenceType: 'Sale',
            referenceId: sale.id,
            createdById: userId,
            deviceId: ctx.deviceId ?? null,
            allowNegative: true,
          });
        }
      }

      // Determine new status: fully vs partially returned.
      const refreshed = await tx.saleItem.findMany({ where: { saleId: sale.id } });
      const fullyReturned = refreshed.every((i) => i.returnedQuantity >= i.quantity);
      const anyReturned = refreshed.some((i) => i.returnedQuantity > 0);
      const status = fullyReturned ? 'RETURNED' : anyReturned ? 'PARTIALLY_RETURNED' : sale.status;

      refundTotal = round2(refundTotal);
      await tx.sale.update({
        where: { id: sale.id },
        data: { status, syncVersion: { increment: 1 } },
      });

      // Record the refund as a negative payment for auditability.
      if (refundTotal.gt(ZERO)) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            method: 'CASH',
            amount: refundTotal.negated(),
            reference: `REFUND ${sale.receiptNumber}`,
            deviceId: ctx.deviceId ?? null,
          },
        });
      }

      // Reduce customer credit balance if the returned goods were on credit.
      if (sale.customerId && sale.paymentStatus !== 'PAID') {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingBalance: { decrement: refundTotal }, syncVersion: { increment: 1 } },
        });
      }

      await this.audit.recordTx(tx, {
        userId,
        action: 'sale.return',
        entity: 'Sale',
        entityId: sale.id,
        metadata: { receiptNumber: sale.receiptNumber, refund: refundTotal.toString() },
        ipAddress: ctx.ipAddress,
      });
    });

    return (await this.repo.findById(id)) as SaleFull;
  }
}

export const saleService = new SaleService();
