/**
 * Reporting & dashboard service.
 *
 * Aggregations run as parameterized raw SQL (Prisma tagged templates — safe from
 * injection) for performance. Cancelled sales are excluded everywhere; profit is
 * net revenue (subtotal, tax-exclusive) minus captured COGS, and product-level
 * figures net out returned quantities.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { inventoryService } from './inventory.service.js';
import type { DateRangeQuery, SalesSummaryQuery, TopProductsQuery } from '../validators/report.validator.js';

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (): Date => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

interface SalesAggregate {
  count: number;
  revenue: string; // net (subtotal)
  tax: string;
  gross: string; // total incl tax
  profit: string; // subtotal - cost
}

export class ReportService {
  private async salesAggregate(from: Date, to: Date): Promise<SalesAggregate> {
    const rows = await prisma.$queryRaw<
      { count: bigint; revenue: string; tax: string; gross: string; profit: string }[]
    >`
      SELECT
        COUNT(*)::bigint AS count,
        COALESCE(SUM("subtotal"), 0)::text AS revenue,
        COALESCE(SUM("taxTotal"), 0)::text AS tax,
        COALESCE(SUM("total"), 0)::text AS gross,
        COALESCE(SUM("subtotal" - "costTotal"), 0)::text AS profit
      FROM sales
      WHERE "isDeleted" = false AND "status" <> 'CANCELLED'
        AND "soldAt" >= ${from} AND "soldAt" <= ${to}`;
    const r = rows[0];
    return {
      count: Number(r?.count ?? 0),
      revenue: r?.revenue ?? '0',
      tax: r?.tax ?? '0',
      gross: r?.gross ?? '0',
      profit: r?.profit ?? '0',
    };
  }

  async todaySales(): Promise<SalesAggregate> {
    return this.salesAggregate(startOfToday(), new Date());
  }

  async monthlySales(): Promise<SalesAggregate> {
    return this.salesAggregate(startOfMonth(), new Date());
  }

  async rangeSales(query: DateRangeQuery): Promise<SalesAggregate> {
    const from = query.from ? new Date(query.from) : startOfMonth();
    const to = query.to ? new Date(query.to) : new Date();
    return this.salesAggregate(from, to);
  }

  /** Time-series of sales bucketed by day/week/month. */
  async salesSummary(query: SalesSummaryQuery): Promise<
    { bucket: string; count: number; revenue: string; profit: string }[]
  > {
    const from = query.from ? new Date(query.from) : startOfMonth();
    const to = query.to ? new Date(query.to) : new Date();
    const trunc = query.groupBy; // day | week | month (validated by zod)
    const rows = await prisma.$queryRaw<
      { bucket: Date; count: bigint; revenue: string; profit: string }[]
    >`
      SELECT
        date_trunc(${trunc}, "soldAt") AS bucket,
        COUNT(*)::bigint AS count,
        COALESCE(SUM("subtotal"), 0)::text AS revenue,
        COALESCE(SUM("subtotal" - "costTotal"), 0)::text AS profit
      FROM sales
      WHERE "isDeleted" = false AND "status" <> 'CANCELLED'
        AND "soldAt" >= ${from} AND "soldAt" <= ${to}
      GROUP BY bucket
      ORDER BY bucket ASC`;
    return rows.map((r) => ({
      bucket: r.bucket.toISOString(),
      count: Number(r.count),
      revenue: r.revenue,
      profit: r.profit,
    }));
  }

  async topProducts(query: TopProductsQuery): Promise<
    { productId: string; name: string; sku: string; unitsSold: number; revenue: string; profit: string }[]
  > {
    const from = query.from ? new Date(query.from) : startOfMonth();
    const to = query.to ? new Date(query.to) : new Date();
    const orderExpr =
      query.by === 'revenue'
        ? Prisma.sql`SUM((si."quantity" - si."returnedQuantity") * si."unitPrice") DESC`
        : Prisma.sql`SUM(si."quantity" - si."returnedQuantity") DESC`;

    const rows = await prisma.$queryRaw<
      { productId: string; name: string; sku: string; units: bigint; revenue: string; profit: string }[]
    >`
      SELECT
        si."productId" AS "productId",
        si."productName" AS name,
        si."sku" AS sku,
        SUM(si."quantity" - si."returnedQuantity")::bigint AS units,
        COALESCE(SUM((si."quantity" - si."returnedQuantity") * si."unitPrice"), 0)::text AS revenue,
        COALESCE(SUM((si."quantity" - si."returnedQuantity") * (si."unitPrice" - si."unitCost")), 0)::text AS profit
      FROM sale_items si
      JOIN sales s ON s."id" = si."saleId"
      WHERE s."isDeleted" = false AND s."status" <> 'CANCELLED'
        AND s."soldAt" >= ${from} AND s."soldAt" <= ${to}
      GROUP BY si."productId", si."productName", si."sku"
      HAVING SUM(si."quantity" - si."returnedQuantity") > 0
      ORDER BY ${orderExpr}
      LIMIT ${query.limit}`;

    return rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      sku: r.sku,
      unitsSold: Number(r.units),
      revenue: r.revenue,
      profit: r.profit,
    }));
  }

  async mostProfitableProducts(
    query: TopProductsQuery,
  ): Promise<
    { productId: string; name: string; sku: string; unitsSold: number; profit: string }[]
  > {
    const from = query.from ? new Date(query.from) : startOfMonth();
    const to = query.to ? new Date(query.to) : new Date();
    const rows = await prisma.$queryRaw<
      { productId: string; name: string; sku: string; units: bigint; profit: string }[]
    >`
      SELECT
        si."productId" AS "productId",
        si."productName" AS name,
        si."sku" AS sku,
        SUM(si."quantity" - si."returnedQuantity")::bigint AS units,
        COALESCE(SUM((si."quantity" - si."returnedQuantity") * (si."unitPrice" - si."unitCost")), 0)::text AS profit
      FROM sale_items si
      JOIN sales s ON s."id" = si."saleId"
      WHERE s."isDeleted" = false AND s."status" <> 'CANCELLED'
        AND s."soldAt" >= ${from} AND s."soldAt" <= ${to}
      GROUP BY si."productId", si."productName", si."sku"
      HAVING SUM(si."quantity" - si."returnedQuantity") > 0
      ORDER BY SUM((si."quantity" - si."returnedQuantity") * (si."unitPrice" - si."unitCost")) DESC
      LIMIT ${query.limit}`;
    return rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      sku: r.sku,
      unitsSold: Number(r.units),
      profit: r.profit,
    }));
  }

  async recentSales(limit = 10): Promise<unknown[]> {
    return prisma.sale.findMany({
      where: { isDeleted: false },
      orderBy: { soldAt: 'desc' },
      take: limit,
      select: {
        id: true,
        receiptNumber: true,
        total: true,
        status: true,
        paymentStatus: true,
        soldAt: true,
        customer: { select: { id: true, name: true } },
        cashier: { select: { id: true, username: true } },
      },
    });
  }

  /** One-shot dashboard payload. */
  async dashboard(): Promise<Record<string, unknown>> {
    const [today, month, stockValue, lowStock, outOfStock, recent, top] = await Promise.all([
      this.todaySales(),
      this.monthlySales(),
      inventoryService.getStockValue(),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM products
        WHERE "isDeleted" = false AND "minStock" > 0 AND "currentStock" <= "minStock"`,
      prisma.product.count({ where: { isDeleted: false, currentStock: { lte: 0 } } }),
      this.recentSales(5),
      this.topProducts({ limit: 5, by: 'quantity' } as TopProductsQuery),
    ]);

    return {
      today: { sales: today.gross, profit: today.profit, transactions: today.count },
      month: { sales: month.gross, profit: month.profit, transactions: month.count },
      inventory: {
        stockRetailValue: stockValue.retailValue,
        stockCostValue: stockValue.costValue,
        totalUnits: stockValue.totalUnits,
        lowStockCount: Number(lowStock[0]?.count ?? 0),
        outOfStockCount: outOfStock,
      },
      recentSales: recent,
      topProducts: top,
    };
  }

  async profitReport(query: DateRangeQuery): Promise<Record<string, unknown>> {
    const agg = await this.rangeSales(query);
    const from = query.from ? new Date(query.from) : startOfMonth();
    const to = query.to ? new Date(query.to) : new Date();
    const expenseRows = await prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM("amount"), 0)::text AS total FROM expenses
      WHERE "isDeleted" = false AND "incurredAt" >= ${from} AND "incurredAt" <= ${to}`;
    const expenses = expenseRows[0]?.total ?? '0';
    const grossProfit = new Prisma.Decimal(agg.profit);
    const netProfit = grossProfit.sub(new Prisma.Decimal(expenses));
    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      revenue: agg.revenue,
      tax: agg.tax,
      grossSales: agg.gross,
      costOfGoodsSold: grossProfit.eq(0) ? '0' : new Prisma.Decimal(agg.revenue).sub(grossProfit).toString(),
      grossProfit: agg.profit,
      expenses,
      netProfit: netProfit.toString(),
      transactions: agg.count,
    };
  }
}

export const reportService = new ReportService();
