import { z } from 'zod';

export const dateRangeQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const salesSummaryQuerySchema = dateRangeQuerySchema.extend({
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export const topProductsQuerySchema = dateRangeQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  by: z.enum(['quantity', 'revenue']).optional().default('quantity'),
});

export const debtorsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type DebtorsQuery = z.infer<typeof debtorsQuerySchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type SalesSummaryQuery = z.infer<typeof salesSummaryQuerySchema>;
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;
