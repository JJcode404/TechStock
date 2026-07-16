import type { Category, Prisma } from '@prisma/client';
import type { RequestContext } from '../types/index.js';
import { CategoryRepository, categoryRepository } from '../repositories/category.repository.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/index.js';
import { slugify } from '../utils/slug.js';
import { resolvePagination, buildOrderBy } from '../utils/pagination.js';
import { buildPaginationMeta, type PaginationMeta } from '../utils/apiResponse.js';
import type {
  CreateCategoryInput,
  ListCategoryQuery,
  UpdateCategoryInput,
} from '../validators/category.validator.js';

const SORTABLE = ['name', 'createdAt', 'updatedAt'];

export class CategoryService {
  constructor(
    private readonly repo: CategoryRepository = categoryRepository,
    private readonly audit: ActivityLogService = activityLogService,
  ) {}

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'category';
    let slug = base;
    let n = 1;
    // Slugs are unique; append a counter on collision.
    while (await this.repo.findBySlug(slug)) {
      slug = `${base}-${n++}`;
      if (n > 50) {
        slug = `${base}-${Date.now()}`;
        break;
      }
    }
    return slug;
  }

  async create(input: CreateCategoryInput, ctx: RequestContext): Promise<Category> {
    if (input.parentId) {
      const parent = await this.repo.findById(input.parentId);
      if (!parent) throw new BadRequestError('Parent category does not exist');
    }
    const slug = await this.uniqueSlug(input.name);
    const category = await this.repo.create({
      name: input.name,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
      slug,
      deviceId: ctx.deviceId ?? null,
    });
    this.audit.record({
      userId: null,
      action: 'category.create',
      entity: 'Category',
      entityId: category.id,
      ipAddress: ctx.ipAddress,
    });
    return category;
  }

  async getById(id: string): Promise<Category> {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundError('Category');
    return category;
  }

  async list(query: ListCategoryQuery): Promise<{ data: Category[]; meta: PaginationMeta }> {
    const pagination = resolvePagination(query);
    const where: Prisma.CategoryWhereInput = {
      ...(query.includeDeleted ? {} : { isDeleted: false }),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const orderBy = buildOrderBy(pagination, SORTABLE, 'name');
    const [data, total] = await this.repo.list(where, pagination.skip, pagination.take, orderBy);
    return { data, meta: buildPaginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async update(id: string, input: UpdateCategoryInput, ctx: RequestContext): Promise<Category> {
    const existing = await this.getById(id);
    if (input.parentId) {
      if (input.parentId === id) throw new BadRequestError('A category cannot be its own parent');
      const parent = await this.repo.findById(input.parentId);
      if (!parent) throw new BadRequestError('Parent category does not exist');
    }
    const data: Prisma.CategoryUpdateInput = {
      name: input.name ?? undefined,
      description: input.description ?? undefined,
      parent: input.parentId ? { connect: { id: input.parentId } } : undefined,
      deviceId: ctx.deviceId ?? undefined,
      syncVersion: { increment: 1 },
    };
    if (input.name && input.name !== existing.name) {
      data.slug = await this.uniqueSlug(input.name);
    }
    const updated = await this.repo.update(id, data);
    this.audit.record({ action: 'category.update', entity: 'Category', entityId: id, ipAddress: ctx.ipAddress });
    return updated;
  }

  async softDelete(id: string, ctx: RequestContext): Promise<void> {
    await this.getById(id);
    const productCount = await this.repo.countProducts(id);
    if (productCount > 0) {
      throw new ConflictError(
        `Cannot delete category with ${productCount} product(s). Reassign them first.`,
      );
    }
    await this.repo.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      syncVersion: { increment: 1 },
      deviceId: ctx.deviceId ?? undefined,
    });
    this.audit.record({ action: 'category.delete', entity: 'Category', entityId: id, ipAddress: ctx.ipAddress });
  }
}

export const categoryService = new CategoryService();
