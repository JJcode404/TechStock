import { z } from 'zod';
import { deviceIdField, paginationQuerySchema } from './common.validator.js';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120).trim(),
  description: z.string().max(500).trim().optional(),
  parentId: z.string().uuid().optional(),
  deviceId: deviceIdField,
});

export const updateCategorySchema = createCategorySchema.partial();

export const listCategoryQuerySchema = paginationQuerySchema.extend({
  parentId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoryQuery = z.infer<typeof listCategoryQuerySchema>;
