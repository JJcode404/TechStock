/**
 * JWT signing/verification for short-lived access tokens.
 *
 * Refresh tokens are NOT JWTs — they are opaque random strings stored (hashed)
 * in the database so they can be revoked. Access tokens are stateless JWTs.
 */
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/index.js';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  } as SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
};

/** Parse a duration string like "7d"/"15m"/"3600s" into milliseconds. */
export const durationToMs = (duration: string): number => {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(duration.trim());
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = Number(match[1]);
  const unit = match[2] ?? 'ms';
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit]!;
};
