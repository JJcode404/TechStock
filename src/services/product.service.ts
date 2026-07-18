import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { Prisma, type Product, type ProductImage } from '@prisma/client';
import type { RequestContext } from '../types/index.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ProductRepository, productRepository } from '../repositories/product.repository.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/index.js';
import { resolvePagination, buildOrderBy } from '../utils/pagination.js';
import { buildPaginationMeta, type PaginationMeta } from '../utils/apiResponse.js';
import { generateSku, generateEan13, buildQrPayload } from '../utils/generators.js';
import { prisma } from '../database/prisma.js';
import type {
  AddImageInput,
  CreateProductInput,
  ListProductQuery,
  UpdateProductInput,
} from '../validators/product.validator.js';

const SORTABLE = ['name', 'sellingPrice', 'currentStock', 'createdAt', 'updatedAt'];

export class ProductService {
  constructor(
    private readonly repo: ProductRepository = productRepository,
    private readonly audit: ActivityLogService = activityLogService,
  ) {}

  private async generateUniqueSku(prefix?: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const sku = generateSku(prefix);
      if (!(await this.repo.findBySku(sku))) return sku;
    }
    throw new ConflictError('Could not generate a unique SKU, please provide one');
  }

  private async generateUniqueBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const barcode = generateEan13();
      if (!(await this.repo.findByBarcode(barcode))) return barcode;
    }
    throw new ConflictError('Could not generate a unique barcode');
  }

  async create(input: CreateProductInput, ctx: RequestContext): Promise<Product> {
    if (input.categoryId) await this.assertCategory(input.categoryId);
    if (input.supplierId) await this.assertSupplier(input.supplierId);

    const sku = input.sku ?? (await this.generateUniqueSku(input.brand ?? input.name));
    if (input.sku && (await this.repo.findBySku(input.sku))) {
      throw new ConflictError('A product with this SKU already exists');
    }

    let barcode = input.barcode ?? null;
    if (!barcode && input.generateBarcode) barcode = await this.generateUniqueBarcode();
    if (input.barcode && (await this.repo.findByBarcode(input.barcode))) {
      throw new ConflictError('A product with this barcode already exists');
    }

    const product = await this.repo.create({
      name: input.name,
      description: input.description ?? null,
      sku,
      barcode,
      qrCode: buildQrPayload('pending', sku), // refined below with real id
      serialNumber: input.serialNumber ?? null,
      brand: input.brand ?? null,
      location: input.location ?? null,
      buyingPrice: new Prisma.Decimal(input.buyingPrice),
      sellingPrice: new Prisma.Decimal(input.sellingPrice),
      wholesalePrice: new Prisma.Decimal(input.wholesalePrice),
      dealerPrice: new Prisma.Decimal(input.dealerPrice),
      taxRate: new Prisma.Decimal(input.taxRate),
      currentStock: input.currentStock,
      minStock: input.minStock,
      maxStock: input.maxStock,
      categoryId: input.categoryId ?? null,
      supplierId: input.supplierId ?? null,
      isActive: input.isActive,
      deviceId: ctx.deviceId ?? null,
    });

    // Now that we have an id, bind the QR payload and record an opening-stock movement.
    const qrCode = buildQrPayload(product.id, sku);
    await this.repo.update(product.id, { qrCode });

    if (input.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'ADJUSTMENT',
          quantity: input.currentStock,
          stockBefore: 0,
          stockAfter: input.currentStock,
          reason: 'Opening stock',
          referenceType: 'Product',
          referenceId: product.id,
          deviceId: ctx.deviceId ?? null,
        },
      });
    }

    this.audit.record({ action: 'product.create', entity: 'Product', entityId: product.id, ipAddress: ctx.ipAddress });
    return (await this.repo.findById(product.id)) as Product;
  }

  async getById(id: string): Promise<Product> {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async getByBarcode(barcode: string): Promise<Product> {
    const product = await this.repo.findByBarcode(barcode);
    if (!product || product.isDeleted) throw new NotFoundError('Product');
    return product;
  }

  async list(query: ListProductQuery): Promise<{ data: Product[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.ProductWhereInput = {
      ...(query.includeDeleted ? {} : { isDeleted: false }),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.brand ? { brand: { equals: query.brand, mode: 'insensitive' } } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.outOfStock ? { currentStock: { lte: 0 } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { barcode: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = buildOrderBy(pagination, SORTABLE, 'name');
    let [data, total] = await this.repo.list(where, pagination.skip, pagination.take, orderBy);

    // lowStock compares two columns; filter post-query for simplicity/consistency.
    if (query.lowStock) {
      data = data.filter((p) => p.minStock > 0 && p.currentStock <= p.minStock);
      total = data.length;
    }
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async update(id: string, input: UpdateProductInput, ctx: RequestContext): Promise<Product> {
    const existing = await this.getById(id);
    if (input.categoryId) await this.assertCategory(input.categoryId);
    if (input.supplierId) await this.assertSupplier(input.supplierId);
    if (input.sku && input.sku !== existing.sku && (await this.repo.findBySku(input.sku))) {
      throw new ConflictError('A product with this SKU already exists');
    }
    if (input.barcode && input.barcode !== existing.barcode && (await this.repo.findByBarcode(input.barcode))) {
      throw new ConflictError('A product with this barcode already exists');
    }

    const data: Prisma.ProductUncheckedUpdateInput = {
      name: input.name ?? undefined,
      description: input.description ?? undefined,
      sku: input.sku ?? undefined,
      barcode: input.barcode ?? undefined,
      serialNumber: input.serialNumber ?? undefined,
      brand: input.brand ?? undefined,
      location: input.location ?? undefined,
      buyingPrice: input.buyingPrice !== undefined ? new Prisma.Decimal(input.buyingPrice) : undefined,
      sellingPrice: input.sellingPrice !== undefined ? new Prisma.Decimal(input.sellingPrice) : undefined,
      wholesalePrice: input.wholesalePrice !== undefined ? new Prisma.Decimal(input.wholesalePrice) : undefined,
      dealerPrice: input.dealerPrice !== undefined ? new Prisma.Decimal(input.dealerPrice) : undefined,
      taxRate: input.taxRate !== undefined ? new Prisma.Decimal(input.taxRate) : undefined,
      minStock: input.minStock ?? undefined,
      maxStock: input.maxStock ?? undefined,
      isActive: input.isActive ?? undefined,
      categoryId: input.categoryId ?? undefined,
      supplierId: input.supplierId ?? undefined,
      deviceId: ctx.deviceId ?? undefined,
      syncVersion: { increment: 1 },
    };
    const updated = await this.repo.update(id, data);
    this.audit.record({ action: 'product.update', entity: 'Product', entityId: id, ipAddress: ctx.ipAddress });
    return updated;
  }

  async softDelete(id: string, ctx: RequestContext): Promise<void> {
    await this.getById(id);
    await this.repo.update(id, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      syncVersion: { increment: 1 },
      deviceId: ctx.deviceId ?? undefined,
    });
    this.audit.record({ action: 'product.delete', entity: 'Product', entityId: id, ipAddress: ctx.ipAddress });
  }

  async addImage(
    productId: string,
    file: Express.Multer.File,
    input: AddImageInput,
    ctx: RequestContext,
  ): Promise<ProductImage> {
    await this.getById(productId);
    if (input.isPrimary) await this.repo.clearPrimaryImages(productId);
    const image = await this.repo.addImage({
      productId,
      url: `/uploads/${file.filename}`,
      altText: input.altText ?? null,
      isPrimary: input.isPrimary,
    });
    this.audit.record({ action: 'product.image.add', entity: 'Product', entityId: productId, ipAddress: ctx.ipAddress });
    return image;
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    const image = await this.repo.findImage(imageId);
    if (!image || image.productId !== productId) throw new NotFoundError('Image');
    await this.repo.deleteImage(imageId);
    await this.deleteImageFile(image.url);
  }

  /**
   * Best-effort removal of the on-disk file backing an image. basename() keeps
   * this confined to the upload dir (no path traversal); a missing file is not
   * an error since the DB row is already gone.
   */
  private async deleteImageFile(url: string): Promise<void> {
    if (!url.startsWith('/uploads/')) return; // external/absolute URL: nothing local to remove
    const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
    const filePath = path.join(uploadRoot, path.basename(url));
    try {
      await unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn({ err, filePath }, 'Failed to delete image file from disk');
      }
    }
  }

  lowStock(limit = 50): Promise<Product[]> {
    return this.repo.lowStock(limit);
  }

  outOfStock(limit = 50): Promise<Product[]> {
    return this.repo.outOfStock(limit);
  }

  private async assertCategory(id: string): Promise<void> {
    const category = await prisma.category.findFirst({ where: { id, isDeleted: false } });
    if (!category) throw new BadRequestError('Category does not exist');
  }

  private async assertSupplier(id: string): Promise<void> {
    const supplier = await prisma.supplier.findFirst({ where: { id, isDeleted: false } });
    if (!supplier) throw new BadRequestError('Supplier does not exist');
  }
}

export const productService = new ProductService();
