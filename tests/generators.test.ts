import { describe, it, expect } from 'vitest';
import {
  buildDocumentNumber,
  buildReceiptNumber,
  ean13CheckDigit,
  generateEan13,
  generateSku,
  buildQrPayload,
} from '../src/utils/generators.js';

describe('generators', () => {
  it('builds zero-padded document numbers', () => {
    const date = new Date(Date.UTC(2026, 6, 16)); // 2026-07-16
    expect(buildDocumentNumber('RCP', 42, date)).toBe('RCP-20260716-000042');
    expect(buildReceiptNumber(1, date)).toBe('RCP-20260716-000001');
  });

  it('computes a valid EAN-13 check digit', () => {
    // Known example: 400638133393 -> check digit 1
    expect(ean13CheckDigit('400638133393')).toBe('1');
  });

  it('generates EAN-13 barcodes with a correct checksum', () => {
    for (let i = 0; i < 100; i += 1) {
      const barcode = generateEan13();
      expect(barcode).toHaveLength(13);
      expect(barcode).toMatch(/^\d{13}$/);
      const check = ean13CheckDigit(barcode.slice(0, 12));
      expect(barcode[12]).toBe(check);
    }
  });

  it('generates SKUs with a sanitized prefix and numeric suffix', () => {
    const sku = generateSku('Dell Laptop!!');
    expect(sku).toMatch(/^[A-Z0-9]{3,6}-\d{6}$/);
    expect(sku.startsWith('DELLL')).toBe(true);
  });

  it('falls back to a padded prefix for short input', () => {
    expect(generateSku('A')).toMatch(/^AXX-\d{6}$/);
  });

  it('builds a URL-safe QR payload', () => {
    const payload = buildQrPayload('abc-123', 'SKU 001');
    expect(payload).toBe('techstock://product/abc-123?sku=SKU%20001');
  });
});
