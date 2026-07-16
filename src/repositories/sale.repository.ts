import type { Prisma, PrismaClient, Sale } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';

export const saleWithRelations = {
  items: true,
  payments: true,
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, firstName: true, lastName: true, username: true } },
} satisfies Prisma.SaleInclude;

export type SaleFull = Prisma.SaleGetPayload<{ include: typeof saleWithRelations }>;

export class SaleRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  findById(id: string): Promise<SaleFull | null> {
    return this.db.sale.findFirst({
      where: { id, isDeleted: false },
      include: saleWithRelations,
    });
  }

  findByReceipt(receiptNumber: string): Promise<SaleFull | null> {
    return this.db.sale.findFirst({
      where: { receiptNumber, isDeleted: false },
      include: saleWithRelations,
    });
  }

  async list(
    where: Prisma.SaleWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.SaleOrderByWithRelationInput,
  ): Promise<[Sale[], number]> {
    return Promise.all([
      this.db.sale.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: { select: { id: true, name: true } },
          cashier: { select: { id: true, username: true } },
          _count: { select: { items: true } },
        },
      }),
      this.db.sale.count({ where }),
    ]);
  }

  /** Count of sales created today (UTC) — used for the daily receipt sequence. */
  countSince(tx: Prisma.TransactionClient, since: Date): Promise<number> {
    return tx.sale.count({ where: { createdAt: { gte: since } } });
  }
}

export const saleRepository = new SaleRepository();
