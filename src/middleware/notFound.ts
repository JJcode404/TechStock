/** 404 handler for unmatched routes. Must be registered after all routes. */
import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors/index.js';

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
};
