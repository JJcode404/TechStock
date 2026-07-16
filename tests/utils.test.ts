import { describe, it, expect } from 'vitest';
import { durationToMs } from '../src/utils/jwt.js';
import { slugify } from '../src/utils/slug.js';
import { resolvePagination, buildOrderBy } from '../src/utils/pagination.js';
import { sha256, generateOpaqueToken } from '../src/utils/crypto.js';

describe('durationToMs', () => {
  it('parses common duration strings', () => {
    expect(durationToMs('15m')).toBe(15 * 60_000);
    expect(durationToMs('7d')).toBe(7 * 86_400_000);
    expect(durationToMs('30s')).toBe(30_000);
    expect(durationToMs('2h')).toBe(2 * 3_600_000);
    expect(durationToMs('500')).toBe(500);
  });

  it('throws on invalid input', () => {
    expect(() => durationToMs('abc')).toThrow();
  });
});

describe('slugify', () => {
  it('produces URL-safe slugs', () => {
    expect(slugify('Laptops & Computers')).toBe('laptops-computers');
    expect(slugify('  Café Déjà Vu  ')).toBe('cafe-deja-vu');
    expect(slugify('Multiple   spaces!!!')).toBe('multiple-spaces');
  });
});

describe('pagination', () => {
  it('applies sane defaults and clamps', () => {
    const p = resolvePagination({});
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(25);
    expect(p.skip).toBe(0);

    const clamped = resolvePagination({ page: 3, pageSize: 10_000 });
    expect(clamped.pageSize).toBe(200); // MAX_PAGE_SIZE
    expect(clamped.skip).toBe((3 - 1) * 200);
  });

  it('only allows whitelisted sort fields', () => {
    const p = resolvePagination({ sortBy: 'evil; DROP TABLE', sortOrder: 'asc' });
    const orderBy = buildOrderBy(p, ['name', 'createdAt'], 'createdAt');
    expect(orderBy).toEqual({ createdAt: 'asc' });

    const valid = buildOrderBy(resolvePagination({ sortBy: 'name' }), ['name'], 'createdAt');
    expect(valid).toEqual({ name: 'desc' });
  });
});

describe('crypto', () => {
  it('hashes deterministically with sha256', () => {
    expect(sha256('hello')).toBe(sha256('hello'));
    expect(sha256('hello')).not.toBe(sha256('world'));
    expect(sha256('x')).toHaveLength(64);
  });

  it('generates unique opaque tokens', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
  });
});
