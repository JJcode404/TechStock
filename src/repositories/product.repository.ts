import type { Prisma, PrismaClient, Product, ProductImage } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';

const withRelations = {
  category: { select: { id: true, name: true, slug: true } },
  supplier: { select: { id: true, name: true } },
  images: { orderBy: { position: 'asc' } as const },
} satisfies Prisma.ProductInclude;

export class ProductRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  create(data: Prisma.ProductUncheckedCreateInput): Promise<Product> {
    return this.db.product.create({ data, include: withRelations });
  }

  findById(id: string, includeDeleted = false): Promise<Product | null> {
    return this.db.product.findFirst({
      where: { id, ...(includeDeleted ? {} : { isDeleted: false }) },
      include: withRelations,
    });
  }

  findBySku(sku: string): Promise<Product | null> {
    return this.db.product.findUnique({ where: { sku } });
  }

  findByBarcode(barcode: string): Promise<Product | null> {
    return this.db.product.findUnique({ where: { barcode } });
  }

  async list(
    where: Prisma.ProductWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.ProductOrderByWithRelationInput,
  ): Promise<[Product[], number]> {
    return Promise.all([
      this.db.product.findMany({ where, skip, take, orderBy, include: withRelations }),
      this.db.product.count({ where }),
    ]);
  }

  update(
    id: string,
    data: Prisma.ProductUpdateInput | Prisma.ProductUncheckedUpdateInput,
  ): Promise<Product> {
    return this.db.product.update({ where: { id }, data, include: withRelations });
  }

  addImage(data: Prisma.ProductImageUncheckedCreateInput): Promise<ProductImage> {
    return this.db.productImage.create({ data });
  }

  clearPrimaryImages(productId: string): Promise<Prisma.BatchPayload> {
    return this.db.productImage.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  findImage(id: string): Promise<ProductImage | null> {
    return this.db.productImage.findUnique({ where: { id } });
  }

  deleteImage(id: string): Promise<ProductImage> {
    return this.db.productImage.delete({ where: { id } });
  }

  /** Low-stock: at or below minStock (and minStock > 0). */
  lowStock(limit: number): Promise<Product[]> {
    return this.db.$queryRaw<Product[]>`
      SELECT * FROM products
      WHERE "isDeleted" = false AND "minStock" > 0 AND "currentStock" <= "minStock"
      ORDER BY "currentStock" ASC
      LIMIT ${limit}`;
  }

  outOfStock(limit: number): Promise<Product[]> {
    return this.db.product.findMany({
      where: { isDeleted: false, currentStock: { lte: 0 } },
      orderBy: { name: 'asc' },
      take: limit,
    });
  }
}

export const productRepository = new ProductRepository();
