/**
 * Deterministic generators for human-readable business identifiers.
 *
 * Document numbers follow: PREFIX-YYYYMMDD-###### where ###### is a daily
 * sequence. The service layer supplies the sequence (computed from a DB count
 * inside the same transaction) so numbers are gap-tolerant but unique per day.
 */
import { randomInt } from 'node:crypto';
import { DOC_PREFIX } from '../constants/index.js';

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

const dateStamp = (date = new Date()): string => {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1, 2);
  const d = pad(date.getUTCDate(), 2);
  return `${y}${m}${d}`;
};

/** e.g. RCP-20260716-000042 */
export const buildDocumentNumber = (prefix: string, sequence: number, date = new Date()): string =>
  `${prefix}-${dateStamp(date)}-${pad(sequence, 6)}`;

export const buildReceiptNumber = (sequence: number, date?: Date): string =>
  buildDocumentNumber(DOC_PREFIX.RECEIPT, sequence, date);

export const buildInvoiceNumber = (sequence: number, date?: Date): string =>
  buildDocumentNumber(DOC_PREFIX.INVOICE, sequence, date);

export const buildOrderNumber = (sequence: number, date?: Date): string =>
  buildDocumentNumber(DOC_PREFIX.PURCHASE_ORDER, sequence, date);

export const buildAdjustmentReference = (sequence: number, date?: Date): string =>
  buildDocumentNumber(DOC_PREFIX.ADJUSTMENT, sequence, date);

/**
 * Auto-generate a SKU from an optional prefix (e.g. category code) plus a random
 * suffix. Uniqueness is enforced at the DB level; the service retries on clash.
 */
export const generateSku = (prefix?: string): string => {
  const base = (prefix ?? DOC_PREFIX.SKU)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
    .padEnd(3, 'X');
  const random = randomInt(0, 1_000_000);
  return `${base}-${pad(random, 6)}`;
};

/**
 * Generate a valid EAN-13 barcode. First 12 digits are random (with a leading
 * "2" — the GS1 range reserved for in-store/internal use), 13th is the checksum.
 */
export const generateEan13 = (): string => {
  let digits = '2';
  for (let i = 0; i < 11; i += 1) digits += String(randomInt(0, 10));
  return digits + ean13CheckDigit(digits);
};

export const ean13CheckDigit = (twelveDigits: string): string => {
  const sum = twelveDigits
    .split('')
    .reduce((acc, ch, idx) => acc + Number(ch) * (idx % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
};

/** A compact, URL-safe QR payload for a product. */
export const buildQrPayload = (productId: string, sku: string): string =>
  `techstock://product/${productId}?sku=${encodeURIComponent(sku)}`;
