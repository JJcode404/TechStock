import { Prisma, type Expense } from '@prisma/client';
import type { RequestContext } from '../types/index.js';
import { ExpenseRepository, expenseRepository } from '../repositories/expense.repository.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import { NotFoundError } from '../errors/index.js';
import { resolvePagination, buildOrderBy } from '../utils/pagination.js';
import { buildPaginationMeta, type PaginationMeta } from '../utils/apiResponse.js';
import type {
  CreateExpenseInput,
  ListExpenseQuery,
  UpdateExpenseInput,
} from '../validators/expense.validator.js';

const SORTABLE = ['incurredAt', 'amount', 'category', 'createdAt'];

export class ExpenseService {
  constructor(
    private readonly repo: ExpenseRepository = expenseRepository,
    private readonly audit: ActivityLogService = activityLogService,
  ) {}

  async create(input: CreateExpenseInput, userId: string, ctx: RequestContext): Promise<Expense> {
    const expense = await this.repo.create({
      category: input.category,
      description: input.description ?? null,
      amount: new Prisma.Decimal(input.amount),
      incurredAt: input.incurredAt ? new Date(input.incurredAt) : new Date(),
      recordedById: userId,
      deviceId: ctx.deviceId ?? null,
    });
    this.audit.record({ userId, action: 'expense.create', entity: 'Expense', entityId: expense.id, ipAddress: ctx.ipAddress });
    return expense;
  }

  async getById(id: string): Promise<Expense> {
    const expense = await this.repo.findById(id);
    if (!expense) throw new NotFoundError('Expense');
    return expense;
  }

  async list(query: ListExpenseQuery): Promise<{ data: Expense[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.ExpenseWhereInput = {
      isDeleted: false,
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(query.from || query.to
        ? {
            incurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const orderBy = buildOrderBy(pagination, SORTABLE, 'incurredAt');
    const [data, total] = await this.repo.list(where, pagination.skip, pagination.take, orderBy);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async update(id: string, input: UpdateExpenseInput, ctx: RequestContext): Promise<Expense> {
    await this.getById(id);
    const data: Prisma.ExpenseUpdateInput = {
      category: input.category ?? undefined,
      description: input.description ?? undefined,
      amount: input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined,
      incurredAt: input.incurredAt ? new Date(input.incurredAt) : undefined,
      deviceId: ctx.deviceId ?? undefined,
      syncVersion: { increment: 1 },
    };
    const updated = await this.repo.update(id, data);
    this.audit.record({ action: 'expense.update', entity: 'Expense', entityId: id, ipAddress: ctx.ipAddress });
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
    this.audit.record({ action: 'expense.delete', entity: 'Expense', entityId: id, ipAddress: ctx.ipAddress });
  }
}

export const expenseService = new ExpenseService();
