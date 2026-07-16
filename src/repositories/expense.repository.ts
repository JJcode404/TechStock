import type { Expense, Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';

export class ExpenseRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  create(data: Prisma.ExpenseUncheckedCreateInput): Promise<Expense> {
    return this.db.expense.create({ data });
  }

  findById(id: string): Promise<Expense | null> {
    return this.db.expense.findFirst({ where: { id, isDeleted: false } });
  }

  async list(
    where: Prisma.ExpenseWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.ExpenseOrderByWithRelationInput,
  ): Promise<[Expense[], number]> {
    return Promise.all([
      this.db.expense.findMany({ where, skip, take, orderBy }),
      this.db.expense.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.ExpenseUpdateInput): Promise<Expense> {
    return this.db.expense.update({ where: { id }, data });
  }
}

export const expenseRepository = new ExpenseRepository();
