/**
 * Shared constants for product-image tooling (placeholder generator + importer).
 */

/** URL/filename prefix that marks an auto-generated placeholder image. */
export const PLACEHOLDER_PREFIX = 'placeholder-';

/** Deterministic placeholder filename for a product SKU. */
export const placeholderFilename = (sku: string): string =>
  `${PLACEHOLDER_PREFIX}${sku.toLowerCase().replace(/[^a-z0-9._-]/g, '-')}.svg`;
