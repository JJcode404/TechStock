import { z } from 'zod';
import { deviceIdField, money, paginationQuerySchema } from './common.validator.js';

const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CREDIT', 'OTHER'] as const;
const PRICE_TIERS = ['RETAIL', 'WHOLESALE', 'DEALER'] as const;

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  // Optional explicit unit price; otherwise derived from the chosen price tier.
  unitPrice: money.optional(),
  priceTier: z.enum(PRICE_TIERS).optional().default('RETAIL'),
  discount: money.optional().default(0),
});

const paymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: money,
  reference: z.string().max(120).optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1, 'A sale must contain at least one item'),
  payments: z.array(paymentSchema).optional().default([]),
  notes: z.string().max(1000).trim().optional(),
  generateInvoice: z.boolean().optional().default(false),
  deviceId: deviceIdField,
});

export const returnSaleSchema = z.object({
  items: z
    .array(
      z.object({
        saleItemId: z.string().uuid(),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1, 'Specify at least one item to return'),
  reason: z.string().max(500).trim().optional(),
  restock: z.boolean().optional().default(true),
  deviceId: deviceIdField,
});

export const cancelSaleSchema = z.object({
  reason: z.string().max(500).trim().optional(),
  deviceId: deviceIdField,
});

export const listSaleQuerySchema = paginationQuerySchema.extend({
  customerId: z.string().uuid().optional(),
  cashierId: z.string().uuid().optional(),
  status: z.enum(['COMPLETED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type ReturnSaleInput = z.infer<typeof returnSaleSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
export type ListSaleQuery = z.infer<typeof listSaleQuerySchema>;
