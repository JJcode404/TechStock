import { z } from 'zod';
import { deviceIdField, money, paginationQuerySchema } from './common.validator.js';

export const createExpenseSchema = z.object({
  category: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional(),
  amount: money.refine((v) => v > 0, 'Amount must be greater than zero'),
  incurredAt: z.string().datetime().optional(),
  deviceId: deviceIdField,
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const listExpenseQuerySchema = paginationQuerySchema.extend({
  category: z.string().max(100).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpenseQuery = z.infer<typeof listExpenseQuerySchema>;
