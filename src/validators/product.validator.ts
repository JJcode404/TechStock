import { z } from 'zod';
import { deviceIdField, money, paginationQuerySchema, percentage } from './common.validator.js';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  sku: z.string().min(2).max(60).trim().optional(), // auto-generated if omitted
  barcode: z.string().min(6).max(60).trim().optional(),
  generateBarcode: z.boolean().optional().default(false),
  serialNumber: z.string().max(120).trim().optional(),
  brand: z.string().max(120).trim().optional(),
  location: z.string().max(120).trim().optional(),

  buyingPrice: money.optional().default(0),
  sellingPrice: money,
  wholesalePrice: money.optional().default(0),
  dealerPrice: money.optional().default(0),
  taxRate: percentage.optional().default(0),

  currentStock: z.coerce.number().int().min(0).optional().default(0),
  minStock: z.coerce.number().int().min(0).optional().default(0),
  maxStock: z.coerce.number().int().min(0).optional().default(0),

  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  isActive: z.boolean().optional().default(true),
  deviceId: deviceIdField,
});

export const updateProductSchema = createProductSchema
  .partial()
  .omit({ currentStock: true }); // stock changes only via inventory movements

export const listProductQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  brand: z.string().max(120).optional(),
  lowStock: z.coerce.boolean().optional(),
  outOfStock: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
});

export const addImageSchema = z.object({
  altText: z.string().max(200).optional(),
  isPrimary: z.coerce.boolean().optional().default(false),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductQuery = z.infer<typeof listProductQuerySchema>;
export type AddImageInput = z.infer<typeof addImageSchema>;
