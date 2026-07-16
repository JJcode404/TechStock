import { z } from 'zod';
import { deviceIdField, paginationQuerySchema } from './common.validator.js';

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(150).trim(),
  contactName: z.string().max(120).trim().optional(),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().min(7).max(20).optional(),
  address: z.string().max(300).trim().optional(),
  taxNumber: z.string().max(50).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
  deviceId: deviceIdField,
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const listSupplierQuerySchema = paginationQuerySchema.extend({
  includeDeleted: z.coerce.boolean().optional().default(false),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSupplierQuery = z.infer<typeof listSupplierQuerySchema>;
