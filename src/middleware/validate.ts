/**
 * Zod validation middleware.
 *
 * Accepts a schema describing any of body/query/params. Parsed (and coerced)
 * values REPLACE the originals so controllers consume clean, typed data.
 * On failure a 422 with structured field errors is thrown.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ValidationError, type ErrorDetail } from '../errors/index.js';

export interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

const toErrorDetails = (error: ZodError): ErrorDetail[] =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || undefined,
    message: issue.message,
    code: issue.code,
  }));

export const validate =
  (schemas: RequestSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        // req.query is a read-only getter in Express 5-style; assign via defineProperty-safe merge.
        const parsedQuery = schemas.query.parse(req.query);
        Object.keys(req.query).forEach((k) => delete (req.query as Record<string, unknown>)[k]);
        Object.assign(req.query, parsedQuery);
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Request validation failed', toErrorDetails(err)));
        return;
      }
      next(err);
    }
  };
