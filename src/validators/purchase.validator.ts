import { z } from 'zod';
import { deviceIdField, money, paginationQuerySchema, percentage } from './common.validator.js';

const poItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unitCost: money,
  taxRate: percentage.optional().default(0),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(poItemSchema).min(1, 'A purchase order needs at least one item'),
  notes: z.string().max(1000).trim().optional(),
  expectedAt: z.string().datetime().optional(),
  submit: z.boolean().optional().default(false), // false = DRAFT, true = ORDERED
  deviceId: deviceIdField,
});

export const updatePurchaseOrderSchema = z.object({
  items: z.array(poItemSchema).min(1).optional(),
  notes: z.string().max(1000).trim().optional(),
  expectedAt: z.string().datetime().optional(),
  deviceId: deviceIdField,
});

export const receivePurchaseOrderSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        receivedQuantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1, 'Specify at least one item to receive'),
  amountPaid: money.optional().default(0),
  updateCostPrice: z.boolean().optional().default(true),
  deviceId: deviceIdField,
});

export const listPurchaseOrderQuerySchema = paginationQuerySchema.extend({
  supplierId: z.string().uuid().optional(),
  status: z
    .enum(['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'])
    .optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
export type ListPurchaseOrderQuery = z.infer<typeof listPurchaseOrderQuerySchema>;
