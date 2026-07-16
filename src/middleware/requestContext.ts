/**
 * Attaches a per-request context: a unique request id (echoed as a response
 * header), the originating device id (for offline sync/audit), client IP and
 * user agent. Everything downstream reads `req.context`.
 */
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const headerId = req.header('x-request-id');
  const deviceId = req.header('x-device-id') ?? undefined;
  const requestId = headerId && headerId.length <= 100 ? headerId : randomUUID();

  req.context = {
    requestId,
    deviceId,
    ipAddress: req.ip,
    userAgent: req.header('user-agent'),
  };

  res.setHeader('x-request-id', requestId);
  next();
};
