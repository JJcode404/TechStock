import { z } from 'zod';
import { deviceIdField, paginationQuerySchema } from './common.validator.js';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(150).trim(),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().min(7).max(20).optional(),
  address: z.string().max(300).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
  deviceId: deviceIdField,
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomerQuerySchema = paginationQuerySchema.extend({
  hasBalance: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
});

export const adjustLoyaltySchema = z.object({
  points: z.coerce.number().int(), // may be negative (redeem)
  reason: z.string().max(200).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomerQuery = z.infer<typeof listCustomerQuerySchema>;
export type AdjustLoyaltyInput = z.infer<typeof adjustLoyaltySchema>;
