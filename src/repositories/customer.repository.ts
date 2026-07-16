import type { Customer, Prisma, PrismaClient, Sale } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';

export class CustomerRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  create(data: Prisma.CustomerUncheckedCreateInput): Promise<Customer> {
    return this.db.customer.create({ data });
  }

  findById(id: string, includeDeleted = false): Promise<Customer | null> {
    return this.db.customer.findFirst({
      where: { id, ...(includeDeleted ? {} : { isDeleted: false }) },
    });
  }

  async list(
    where: Prisma.CustomerWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.CustomerOrderByWithRelationInput,
  ): Promise<[Customer[], number]> {
    return Promise.all([
      this.db.customer.findMany({ where, skip, take, orderBy }),
      this.db.customer.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.db.customer.update({ where: { id }, data });
  }

  async purchaseHistory(customerId: string, skip: number, take: number): Promise<[Sale[], number]> {
    const where: Prisma.SaleWhereInput = { customerId, isDeleted: false };
    return Promise.all([
      this.db.sale.findMany({
        where,
        skip,
        take,
        orderBy: { soldAt: 'desc' },
        include: { _count: { select: { items: true } } },
      }),
      this.db.sale.count({ where }),
    ]);
  }
}

export const customerRepository = new CustomerRepository();
