import type { Category, Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';

export class CategoryRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  create(data: Prisma.CategoryUncheckedCreateInput): Promise<Category> {
    return this.db.category.create({ data });
  }

  findById(id: string, includeDeleted = false): Promise<Category | null> {
    return this.db.category.findFirst({
      where: { id, ...(includeDeleted ? {} : { isDeleted: false }) },
    });
  }

  findBySlug(slug: string): Promise<Category | null> {
    return this.db.category.findUnique({ where: { slug } });
  }

  async list(
    where: Prisma.CategoryWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.CategoryOrderByWithRelationInput,
  ): Promise<[Category[], number]> {
    return Promise.all([
      this.db.category.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { _count: { select: { products: true, children: true } } },
      }),
      this.db.category.count({ where }),
    ]);
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.db.category.update({ where: { id }, data });
  }

  countProducts(categoryId: string): Promise<number> {
    return this.db.product.count({ where: { categoryId, isDeleted: false } });
  }
}

export const categoryRepository = new CategoryRepository();
