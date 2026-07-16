/**
 * Cryptographic helpers.
 *
 * Refresh tokens are opaque random strings. We store only the SHA-256 hash so a
 * database leak does not expose usable tokens (same principle as password hashes,
 * but fast hashing is fine here because the token has high entropy).
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const generateOpaqueToken = (bytes = 48): string =>
  randomBytes(bytes).toString('base64url');

export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const uuid = (): string => randomUUID();
