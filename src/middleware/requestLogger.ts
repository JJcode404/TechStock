/**
 * HTTP request logging via pino-http. Reuses the app logger, tags each log line
 * with the request id, and keeps noisy health checks at debug level.
 */
import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = (req as { context?: { requestId: string } }).context?.requestId;
    const id = existing ?? randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (req.url?.startsWith('/health') || req.url?.startsWith('/metrics')) return 'debug';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
