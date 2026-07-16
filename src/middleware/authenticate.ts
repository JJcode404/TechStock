/**
 * Authentication middleware.
 *
 * Verifies the Bearer access token and populates `req.user`. The token is a
 * stateless JWT, but we also verify the session referenced by the token is
 * still active so that logout / forced revocation takes effect immediately.
 */
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../database/prisma.js';
import { UnauthorizedError } from '../errors/index.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const extractBearer = (req: Request): string | null => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
};

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (!token) throw new UnauthorizedError('Missing Bearer token');

  const payload = verifyAccessToken(token);

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    select: { isRevoked: true, expiresAt: true, userId: true },
  });

  if (!session || session.isRevoked || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Session is no longer valid');
  }

  // Keep the session's activity timestamp fresh (best-effort, non-blocking).
  void prisma.session
    .update({ where: { id: payload.sessionId }, data: { lastActiveAt: new Date() } })
    .catch(() => undefined);

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions,
    sessionId: payload.sessionId,
  };

  next();
});

/**
 * Optional authentication: populates req.user when a valid token is present but
 * does not reject anonymous requests. Useful for public endpoints that vary by
 * auth state.
 */
export const optionalAuthenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearer(req);
    if (!token) return next();
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        sessionId: payload.sessionId,
      };
    } catch {
      // ignore invalid token for optional auth
    }
    next();
  },
);
