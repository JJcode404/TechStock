import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authorize, requirePermission } from '../src/middleware/authorize.js';
import { ForbiddenError, UnauthorizedError } from '../src/errors/index.js';
import { ROLES, PERMISSIONS } from '../src/constants/index.js';
import { buildPaginationMeta } from '../src/utils/apiResponse.js';

const mockReq = (user?: Partial<Request['user']>): Request =>
  ({ user: user as Request['user'] }) as Request;
const res = {} as Response;

describe('authorize (roles)', () => {
  it('rejects anonymous requests', () => {
    expect(() => authorize(ROLES.ADMIN)(mockReq(), res, vi.fn())).toThrow(UnauthorizedError);
  });

  it('allows a matching role', () => {
    const next = vi.fn();
    authorize(ROLES.MANAGER, ROLES.ADMIN)(
      mockReq({ role: ROLES.MANAGER, permissions: [] }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('forbids a non-matching role', () => {
    expect(() =>
      authorize(ROLES.ADMIN)(mockReq({ role: ROLES.CASHIER, permissions: [] }), res, vi.fn()),
    ).toThrow(ForbiddenError);
  });
});

describe('requirePermission', () => {
  it('lets ADMIN bypass all permission checks', () => {
    const next = vi.fn();
    requirePermission(PERMISSIONS.USER_MANAGE)(
      mockReq({ role: ROLES.ADMIN, permissions: [] }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows when all required permissions are granted', () => {
    const next = vi.fn();
    requirePermission(PERMISSIONS.SALE_CREATE)(
      mockReq({ role: ROLES.CASHIER, permissions: [PERMISSIONS.SALE_CREATE] }),
      res,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('forbids when a permission is missing', () => {
    expect(() =>
      requirePermission(PERMISSIONS.SALE_CANCEL)(
        mockReq({ role: ROLES.CASHIER, permissions: [PERMISSIONS.SALE_CREATE] }),
        res,
        vi.fn(),
      ),
    ).toThrow(ForbiddenError);
  });
});

describe('buildPaginationMeta', () => {
  it('computes page navigation flags', () => {
    expect(buildPaginationMeta(2, 25, 100)).toEqual({
      page: 2,
      pageSize: 25,
      total: 100,
      totalPages: 4,
      hasNext: true,
      hasPrev: true,
    });
    expect(buildPaginationMeta(1, 25, 10)).toMatchObject({ totalPages: 1, hasNext: false, hasPrev: false });
  });
});
