/**
 * Reusable Zod primitives shared across validators.
 */
import { z } from 'zod';
import { APP } from '../constants/index.js';

export const uuidParam = (name = 'id') =>
  z.object({ [name]: z.string().uuid(`${name} must be a valid UUID`) });

export const idParamSchema = z.object({ id: z.string().uuid('id must be a valid UUID') });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(APP.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(APP.MAX_PAGE_SIZE)
    .optional()
    .default(APP.DEFAULT_PAGE_SIZE),
  sortBy: z.string().min(1).max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().trim().max(200).optional(),
});

export const money = z.coerce
  .number()
  .nonnegative('Must be a non-negative amount')
  .finite();

export const percentage = z.coerce.number().min(0).max(100);

/** Optional device id carried by offline clients on write operations. */
export const deviceIdField = z.string().min(1).max(100).optional();
