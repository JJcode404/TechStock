import type { Prisma, PurchaseOrder, Supplier } from '@prisma/client';
import type { RequestContext } from '../types/index.js';
import { SupplierRepository, supplierRepository } from '../repositories/supplier.repository.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import { NotFoundError } from '../errors/index.js';
import { resolvePagination, buildOrderBy } from '../utils/pagination.js';
import { buildPaginationMeta, type PaginationMeta } from '../utils/apiResponse.js';
import type {
  CreateSupplierInput,
  ListSupplierQuery,
  UpdateSupplierInput,
} from '../validators/supplier.validator.js';

const SORTABLE = ['name', 'outstandingBalance', 'createdAt', 'updatedAt'];

export class SupplierService {
  constructor(
    private readonly repo: SupplierRepository = supplierRepository,
    private readonly audit: ActivityLogService = activityLogService,
  ) {}

  async create(input: CreateSupplierInput, ctx: RequestContext): Promise<Supplier> {
    const supplier = await this.repo.create({
      name: input.name,
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      taxNumber: input.taxNumber ?? null,
      notes: input.notes ?? null,
      deviceId: ctx.deviceId ?? null,
    });
    this.audit.record({ action: 'supplier.create', entity: 'Supplier', entityId: supplier.id, ipAddress: ctx.ipAddress });
    return supplier;
  }

  async getById(id: string): Promise<Supplier> {
    const supplier = await this.repo.findById(id);
    if (!supplier) throw new NotFoundError('Supplier');
    return supplier;
  }

  async list(query: ListSupplierQuery): Promise<{ data: Supplier[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.SupplierWhereInput = {
      ...(query.includeDeleted ? {} : { isDeleted: false }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy = buildOrderBy(pagination, SORTABLE, 'name');
    const [data, total] = await this.repo.list(where, pagination.skip, pagination.take, orderBy);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async update(id: string, input: UpdateSupplierInput, ctx: RequestContext): Promise<Supplier> {
    await this.getById(id);
    const updated = await this.repo.update(id, {
      ...input,
      deviceId: ctx.deviceId ?? undefined,
      syncVersion: { increment: 1 },
    } as Prisma.SupplierUpdateInput);
    this.audit.record({ action: 'supplier.update', entity: 'Supplier', entityId: id, ipAddress: ctx.ipAddress });
    return updated;
  }

  async softDelete(id: string, ctx: RequestContext): Promise<void> {
    await this.getById(id);
    await this.repo.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      syncVersion: { increment: 1 },
      deviceId: ctx.deviceId ?? undefined,
    });
    this.audit.record({ action: 'supplier.delete', entity: 'Supplier', entityId: id, ipAddress: ctx.ipAddress });
  }

  async purchaseHistory(
    id: string,
    query: { page?: number; pageSize?: number },
  ): Promise<{ data: PurchaseOrder[]; meta: PaginationMeta }> {
    await this.getById(id);
    const pagination = resolvePagination(query);
    const [data, total] = await this.repo.purchaseHistory(id, pagination.skip, pagination.take);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async getOutstandingBalance(id: string): Promise<{ supplierId: string; outstandingBalance: string }> {
    const supplier = await this.getById(id);
    return { supplierId: id, outstandingBalance: supplier.outstandingBalance.toString() };
  }
}

export const supplierService = new SupplierService();
