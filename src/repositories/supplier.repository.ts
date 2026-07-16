import type { Prisma, PrismaClient, PurchaseOrder, Supplier } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';

export class SupplierRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  create(data: Prisma.SupplierUncheckedCreateInput): Promise<Supplier> {
    return this.db.supplier.create({ data });
  }

  findById(id: string, includeDeleted = false): Promise<Supplier | null> {
    return this.db.supplier.findFirst({
      where: { id, ...(includeDeleted ? {} : { isDeleted: false }) },
    });
  }

  async list(
    where: Prisma.SupplierWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.SupplierOrderByWithRelationInput,
  ): Promise<[Supplier[], number]> {
    return Promise.all([
      this.db.supplier.findMany({ where, skip, take, orderBy }),
      this.db.supplier.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.SupplierUpdateInput): Promise<Supplier> {
    return this.db.supplier.update({ where: { id }, data });
  }

  async purchaseHistory(
    supplierId: string,
    skip: number,
    take: number,
  ): Promise<[PurchaseOrder[], number]> {
    const where: Prisma.PurchaseOrderWhereInput = { supplierId, isDeleted: false };
    return Promise.all([
      this.db.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
      }),
      this.db.purchaseOrder.count({ where }),
    ]);
  }
}

export const supplierRepository = new SupplierRepository();
