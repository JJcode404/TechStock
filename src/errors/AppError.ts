/**
 * Custom error hierarchy.
 *
 * Every operational error thrown by the application extends AppError. The global
 * error handler uses `isOperational` to distinguish expected errors (safe to
 * surface to the client) from unexpected bugs (logged and returned as 500).
 */
import { HTTP_STATUS, type HttpStatus } from '../constants/http.js';

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly isOperational: boolean;
  public readonly errors: ErrorDetail[];
  public readonly code: string;

  constructor(
    message: string,
    statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    options: { errors?: ErrorDetail[]; code?: string; isOperational?: boolean } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = options.errors ?? [];
    this.code = options.code ?? this.constructor.name;
    this.isOperational = options.isOperational ?? true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', errors: ErrorDetail[] = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, { errors, code: 'BAD_REQUEST' });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors: ErrorDetail[] = []) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, { errors, code: 'VALIDATION_ERROR' });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, HTTP_STATUS.UNAUTHORIZED, { code: 'UNAUTHORIZED' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, HTTP_STATUS.FORBIDDEN, { code: 'FORBIDDEN' });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND, { code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', errors: ErrorDetail[] = []) {
    super(message, HTTP_STATUS.CONFLICT, { errors, code: 'CONFLICT' });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, { code: 'RATE_LIMITED' });
  }
}

export class InsufficientStockError extends BadRequestError {
  constructor(productName: string, available: number, requested: number) {
    super(`Insufficient stock for "${productName}": available ${available}, requested ${requested}`, [
      { field: 'quantity', message: `Only ${available} in stock`, code: 'INSUFFICIENT_STOCK' },
    ]);
  }
}
