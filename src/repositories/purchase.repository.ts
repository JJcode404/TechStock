import type { Prisma, PrismaClient, PurchaseOrder } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';

export const poWithRelations = {
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, username: true } },
} satisfies Prisma.PurchaseOrderInclude;

export type PurchaseOrderFull = Prisma.PurchaseOrderGetPayload<{ include: typeof poWithRelations }>;

export class PurchaseRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  findById(id: string): Promise<PurchaseOrderFull | null> {
    return this.db.purchaseOrder.findFirst({
      where: { id, isDeleted: false },
      include: poWithRelations,
    });
  }

  async list(
    where: Prisma.PurchaseOrderWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.PurchaseOrderOrderByWithRelationInput,
  ): Promise<[PurchaseOrder[], number]> {
    return Promise.all([
      this.db.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.db.purchaseOrder.count({ where }),
    ]);
  }

  countSince(tx: Prisma.TransactionClient, since: Date): Promise<number> {
    return tx.purchaseOrder.count({ where: { createdAt: { gte: since } } });
  }
}

export const purchaseRepository = new PurchaseRepository();
