import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { ensureLinePriceAboveBuyingPrice } from '../src/services/sale.service.js';

describe('sale pricing guard', () => {
  it('rejects a sale price below the product buying price', () => {
    expect(() =>
      ensureLinePriceAboveBuyingPrice(
        'Keyboard',
        new Prisma.Decimal('99.99'),
        new Prisma.Decimal('100'),
      ),
    ).toThrow(/below cost|buying price/i);
  });

  it('accepts a sale price at or above the product buying price', () => {
    expect(() =>
      ensureLinePriceAboveBuyingPrice(
        'Keyboard',
        new Prisma.Decimal('100'),
        new Prisma.Decimal('100'),
      ),
    ).not.toThrow();
  });
});
