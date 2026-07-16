/**
 * Wraps an async Express handler so rejected promises are forwarded to the
 * global error handler via next(err) instead of crashing the process.
 *
 * Usage: router.get('/', asyncHandler(controller.list))
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
