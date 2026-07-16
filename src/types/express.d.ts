/**
 * Express Request augmentation.
 *
 * `req.user` is populated by the authenticate middleware, `req.context` carries
 * request-scoped metadata (id, deviceId) used for auditing and offline sync.
 */
import type { AccessTokenPayload } from '../utils/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      context: RequestContext;
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

export interface RequestContext {
  requestId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type { AccessTokenPayload };

export {};
