export * from './roles.js';
export * from './http.js';

/** Application-wide magic values kept in one place. */
export const APP = {
  NAME: 'TechStock',
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 200,
} as const;

/**
 * Document number prefixes for human-readable identifiers.
 * e.g. RCP-20260716-000042
 */
export const DOC_PREFIX = {
  RECEIPT: 'RCP',
  INVOICE: 'INV',
  PURCHASE_ORDER: 'PO',
  SALE: 'SALE',
  ADJUSTMENT: 'ADJ',
  SKU: 'SKU',
} as const;
