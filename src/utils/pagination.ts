/**
 * Normalizes pagination/sort query params into safe Prisma-ready values.
 */
import { APP } from '../constants/index.js';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export interface RawPaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const resolvePagination = (query: RawPaginationQuery = {}): PaginationParams => {
  const page = Math.max(1, query.page ?? APP.DEFAULT_PAGE);
  const pageSize = Math.min(
    APP.MAX_PAGE_SIZE,
    Math.max(1, query.pageSize ?? APP.DEFAULT_PAGE_SIZE),
  );
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder ?? 'desc',
  };
};

/**
 * Builds a Prisma orderBy object, guarding against injecting arbitrary column
 * names by restricting to an allowlist.
 */
export const buildOrderBy = (
  params: PaginationParams,
  allowedFields: string[],
  fallback = 'createdAt',
): Record<string, 'asc' | 'desc'> => {
  const field = params.sortBy && allowedFields.includes(params.sortBy) ? params.sortBy : fallback;
  return { [field]: params.sortOrder };
};
