/**
 * Global error handler — the single place that turns any thrown error into the
 * standard error envelope: { success:false, message, errors }.
 *
 * It normalizes:
 *   - AppError (operational)            -> its own status/message/errors
 *   - ZodError                          -> 422 with field errors
 *   - Prisma known request errors       -> 409/404/400 as appropriate
 *   - JWT errors                        -> 401
 *   - Multer upload errors              -> 400
 *   - Everything else                   -> 500 (message hidden in production)
 */
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import { MulterError } from 'multer';
import { AppError, type ErrorDetail } from '../errors/index.js';
import { HTTP_STATUS, type HttpStatus } from '../constants/index.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// jsonwebtoken is CommonJS; its error classes aren't exposed as ESM named exports.
const { JsonWebTokenError, TokenExpiredError } = jwt;

interface NormalizedError {
  statusCode: HttpStatus;
  message: string;
  errors: ErrorDetail[];
  code: string;
  isOperational: boolean;
}

const mapPrismaError = (err: Prisma.PrismaClientKnownRequestError): NormalizedError => {
  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return {
        statusCode: HTTP_STATUS.CONFLICT,
        message: `A record with this ${target} already exists`,
        errors: [{ field: target, message: 'Must be unique', code: 'UNIQUE_VIOLATION' }],
        code: 'CONFLICT',
        isOperational: true,
      };
    }
    case 'P2025':
      return {
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: (err.meta?.cause as string | undefined) ?? 'Record not found',
        errors: [],
        code: 'NOT_FOUND',
        isOperational: true,
      };
    case 'P2003':
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Related record constraint failed',
        errors: [{ message: 'Invalid foreign key reference', code: 'FK_VIOLATION' }],
        code: 'BAD_REQUEST',
        isOperational: true,
      };
    default:
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Database request error',
        errors: [{ message: err.code, code: 'DB_ERROR' }],
        code: 'DB_ERROR',
        isOperational: true,
      };
  }
};

const normalize = (err: unknown): NormalizedError => {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      code: err.code,
      isOperational: err.isOperational,
    };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: 'Validation failed',
      errors: err.issues.map((i) => ({
        field: i.path.join('.') || undefined,
        message: i.message,
        code: i.code,
      })),
      code: 'VALIDATION_ERROR',
      isOperational: true,
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return mapPrismaError(err);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Invalid database query',
      errors: [],
      code: 'DB_VALIDATION',
      isOperational: true,
    };
  }

  if (err instanceof TokenExpiredError) {
    return {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Token has expired',
      errors: [],
      code: 'TOKEN_EXPIRED',
      isOperational: true,
    };
  }

  if (err instanceof JsonWebTokenError) {
    return {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Invalid token',
      errors: [],
      code: 'INVALID_TOKEN',
      isOperational: true,
    };
  }

  if (err instanceof MulterError) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: `File upload error: ${err.message}`,
      errors: [{ field: err.field, message: err.code, code: 'UPLOAD_ERROR' }],
      code: 'UPLOAD_ERROR',
      isOperational: true,
    };
  }

  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    errors: [],
    code: 'INTERNAL_ERROR',
    isOperational: false,
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const normalized = normalize(err);

  const logPayload = {
    requestId: req.context?.requestId,
    statusCode: normalized.statusCode,
    code: normalized.code,
    err,
  };

  if (!normalized.isOperational || normalized.statusCode >= 500) {
    logger.error(logPayload, 'Unhandled error');
  } else {
    logger.warn(logPayload, 'Operational error');
  }

  // Never leak internal error details/stack in production for 500s.
  const message =
    !normalized.isOperational && env.isProduction ? 'Internal server error' : normalized.message;

  res.status(normalized.statusCode).json({
    success: false,
    message,
    errors: normalized.errors,
    ...(env.isProduction ? {} : { code: normalized.code }),
  });
};
