import { describe, it, expect } from 'vitest';
import { toDecimal, round2, taxAmount, sum, ZERO } from '../src/utils/money.js';

describe('money helpers', () => {
  it('rounds to 2 decimal places half-up', () => {
    expect(round2(toDecimal('1.005')).toString()).toBe('1.01');
    expect(round2(toDecimal('1.004')).toString()).toBe('1');
    expect(round2(toDecimal('2.555')).toString()).toBe('2.56');
  });

  it('computes tax amounts correctly', () => {
    expect(taxAmount(toDecimal('1000'), 16).toString()).toBe('160');
    expect(taxAmount(toDecimal('250'), 16).toString()).toBe('40');
    expect(taxAmount(toDecimal('0'), 16).toString()).toBe('0');
  });

  it('sums a list of decimals', () => {
    expect(sum([toDecimal('1.10'), toDecimal('2.20'), toDecimal('3.30')]).toString()).toBe('6.6');
    expect(sum([]).eq(ZERO)).toBe(true);
  });

  it('does not accumulate floating point error', () => {
    // 0.1 + 0.2 !== 0.3 in float, but Decimal is exact.
    expect(toDecimal('0.1').add(toDecimal('0.2')).toString()).toBe('0.3');
  });
});
