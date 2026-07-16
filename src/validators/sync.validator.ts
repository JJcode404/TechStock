import { z } from 'zod';

/** Entities that offline clients may pull. */
export const PULLABLE_ENTITIES = [
  'products',
  'categories',
  'customers',
  'suppliers',
  'sales',
  'stockMovements',
  'settings',
] as const;

/** Master-data entities that clients may push (LWW). Transactional entities
 * (sales, stock) are created through their own endpoints, not pushed. */
export const PUSHABLE_ENTITIES = ['products', 'categories', 'customers', 'suppliers'] as const;

export const pullQuerySchema = z.object({
  since: z.string().datetime().optional(),
  entities: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()) : [...PULLABLE_ENTITIES]))
    .pipe(z.array(z.enum(PULLABLE_ENTITIES))),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
});

const pushChangeSchema = z.object({
  entity: z.enum(PUSHABLE_ENTITIES),
  id: z.string().uuid(),
  updatedAt: z.string().datetime(),
  isDeleted: z.boolean().optional().default(false),
  data: z.record(z.string(), z.unknown()),
});

export const pushBodySchema = z.object({
  deviceId: z.string().min(1).max(100),
  changes: z.array(pushChangeSchema).min(1).max(500),
});

export type PullQuery = z.infer<typeof pullQuerySchema>;
export type PushBody = z.infer<typeof pushBodySchema>;
export type PushChange = z.infer<typeof pushChangeSchema>;
