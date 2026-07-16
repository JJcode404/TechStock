import { z } from 'zod';
import { deviceIdField, paginationQuerySchema } from './common.validator.js';

const MOVEMENT_TYPES = ['SALE', 'PURCHASE', 'RETURN', 'DAMAGE', 'ADJUSTMENT', 'TRANSFER'] as const;
const ADJUSTMENT_REASONS = [
  'STOCK_COUNT',
  'DAMAGE',
  'THEFT',
  'EXPIRY',
  'CORRECTION',
  'OTHER',
] as const;

export const createAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  newQuantity: z.coerce.number().int().min(0, 'newQuantity cannot be negative'),
  reason: z.enum(ADJUSTMENT_REASONS),
  notes: z.string().max(500).trim().optional(),
  deviceId: deviceIdField,
});

export const listMovementQuerySchema = paginationQuerySchema.extend({
  productId: z.string().uuid().optional(),
  type: z.enum(MOVEMENT_TYPES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const listAdjustmentQuerySchema = paginationQuerySchema.extend({
  productId: z.string().uuid().optional(),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type ListMovementQuery = z.infer<typeof listMovementQuerySchema>;
export type ListAdjustmentQuery = z.infer<typeof listAdjustmentQuerySchema>;
