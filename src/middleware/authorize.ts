/**
 * Role- and permission-based authorization guards.
 *
 * `authorize(...roles)` — coarse role check (ADMIN/MANAGER/CASHIER).
 * `requirePermission(...perms)` — fine-grained capability check.
 * ADMIN implicitly passes every permission check.
 */
import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';
import { ROLES, type PermissionName, type RoleName } from '../constants/index.js';

export const authorize =
  (...roles: RoleName[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role as RoleName)) {
      throw new ForbiddenError(`Requires one of roles: ${roles.join(', ')}`);
    }
    next();
  };

export const requirePermission =
  (...required: PermissionName[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role === ROLES.ADMIN) return next();

    const granted = new Set(req.user.permissions);
    const missing = required.filter((perm) => !granted.has(perm));
    if (missing.length > 0) {
      throw new ForbiddenError(`Missing permission(s): ${missing.join(', ')}`);
    }
    next();
  };
