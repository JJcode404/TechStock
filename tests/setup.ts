/**
 * Global test setup. Loaded before the test suite runs.
 * Ensures a predictable environment for unit tests that don't hit a real DB.
 */
import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-that-is-at-least-32-chars';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-that-is-at-least-32-chars';
  process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/techstock_test';
});
