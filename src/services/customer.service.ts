import { Prisma, type Customer, type Sale } from '@prisma/client';
import type { RequestContext } from '../types/index.js';
import { CustomerRepository, customerRepository } from '../repositories/customer.repository.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import { BadRequestError, NotFoundError } from '../errors/index.js';
import { resolvePagination, buildOrderBy } from '../utils/pagination.js';
import { buildPaginationMeta, type PaginationMeta } from '../utils/apiResponse.js';
import type {
  AdjustLoyaltyInput,
  CreateCustomerInput,
  ListCustomerQuery,
  UpdateCustomerInput,
} from '../validators/customer.validator.js';

const SORTABLE = ['name', 'outstandingBalance', 'loyaltyPoints', 'createdAt', 'updatedAt'];

export class CustomerService {
  constructor(
    private readonly repo: CustomerRepository = customerRepository,
    private readonly audit: ActivityLogService = activityLogService,
  ) {}

  async create(input: CreateCustomerInput, ctx: RequestContext): Promise<Customer> {
    const customer = await this.repo.create({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      deviceId: ctx.deviceId ?? null,
    });
    this.audit.record({ action: 'customer.create', entity: 'Customer', entityId: customer.id, ipAddress: ctx.ipAddress });
    return customer;
  }

  async getById(id: string): Promise<Customer> {
    const customer = await this.repo.findById(id);
    if (!customer) throw new NotFoundError('Customer');
    return customer;
  }

  async list(query: ListCustomerQuery): Promise<{ data: Customer[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.CustomerWhereInput = {
      ...(query.includeDeleted ? {} : { isDeleted: false }),
      ...(query.hasBalance ? { outstandingBalance: { gt: 0 } } : {}),
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

  async update(id: string, input: UpdateCustomerInput, ctx: RequestContext): Promise<Customer> {
    await this.getById(id);
    const updated = await this.repo.update(id, {
      ...input,
      deviceId: ctx.deviceId ?? undefined,
      syncVersion: { increment: 1 },
    } as Prisma.CustomerUpdateInput);
    this.audit.record({ action: 'customer.update', entity: 'Customer', entityId: id, ipAddress: ctx.ipAddress });
    return updated;
  }

  async softDelete(id: string, ctx: RequestContext): Promise<void> {
    const customer = await this.getById(id);
    if (customer.outstandingBalance.gt(0)) {
      throw new BadRequestError('Cannot delete a customer with an outstanding balance');
    }
    await this.repo.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      syncVersion: { increment: 1 },
      deviceId: ctx.deviceId ?? undefined,
    });
    this.audit.record({ action: 'customer.delete', entity: 'Customer', entityId: id, ipAddress: ctx.ipAddress });
  }

  async purchaseHistory(
    id: string,
    query: { page?: number; pageSize?: number },
  ): Promise<{ data: Sale[]; meta: PaginationMeta }> {
    await this.getById(id);
    const pagination = resolvePagination(query);
    const [data, total] = await this.repo.purchaseHistory(id, pagination.skip, pagination.take);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async getOutstandingBalance(id: string): Promise<{ customerId: string; outstandingBalance: string }> {
    const customer = await this.getById(id);
    return { customerId: id, outstandingBalance: customer.outstandingBalance.toString() };
  }

  async adjustLoyalty(id: string, input: AdjustLoyaltyInput, ctx: RequestContext): Promise<Customer> {
    const customer = await this.getById(id);
    const newTotal = customer.loyaltyPoints + input.points;
    if (newTotal < 0) throw new BadRequestError('Insufficient loyalty points to redeem');
    const updated = await this.repo.update(id, {
      loyaltyPoints: newTotal,
      syncVersion: { increment: 1 },
    });
    this.audit.record({
      action: 'customer.loyalty.adjust',
      entity: 'Customer',
      entityId: id,
      metadata: { points: input.points, reason: input.reason ?? null },
      ipAddress: ctx.ipAddress,
    });
    return updated;
  }
}

export const customerService = new CustomerService();
