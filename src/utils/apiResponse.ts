/**
 * Standard API response envelope.
 *
 * Every successful response is `{ success, message, data, meta? }`.
 * Every error response is `{ success: false, message, errors }` — produced by
 * the global error handler. These helpers keep controllers consistent.
 */
import type { Response } from 'express';
import { HTTP_STATUS, type HttpStatus } from '../constants/http.js';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode: HttpStatus = HTTP_STATUS.OK,
  meta?: PaginationMeta | Record<string, unknown>,
): Response => {
  const body: SuccessBody<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

export const sendCreated = <T>(res: Response, data: T, message = 'Created successfully'): Response =>
  sendSuccess(res, data, message, HTTP_STATUS.CREATED);

export const sendNoContent = (res: Response): Response =>
  res.status(HTTP_STATUS.NO_CONTENT).send();

export const buildPaginationMeta = (
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta => {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};
