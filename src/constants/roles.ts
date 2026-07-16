/**
 * Canonical role and permission definitions.
 *
 * Roles are coarse-grained (Admin/Manager/Cashier). Permissions are
 * fine-grained capabilities that the permission middleware checks. The
 * ROLE_PERMISSIONS map is the source of truth used by the seed script to
 * provision the RBAC tables.
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Products & catalog
  PRODUCT_CREATE: 'product:create',
  PRODUCT_READ: 'product:read',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',

  // Inventory
  INVENTORY_READ: 'inventory:read',
  INVENTORY_ADJUST: 'inventory:adjust',

  // Sales / POS
  SALE_CREATE: 'sale:create',
  SALE_READ: 'sale:read',
  SALE_CANCEL: 'sale:cancel',
  SALE_RETURN: 'sale:return',

  // Purchases
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_READ: 'purchase:read',
  PURCHASE_UPDATE: 'purchase:update',
  PURCHASE_RECEIVE: 'purchase:receive',

  // Customers & suppliers
  CUSTOMER_MANAGE: 'customer:manage',
  SUPPLIER_MANAGE: 'supplier:manage',

  // Reports
  REPORT_VIEW: 'report:view',

  // Administration
  USER_MANAGE: 'user:manage',
  SETTINGS_MANAGE: 'settings:manage',
  BACKUP_RUN: 'backup:run',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Which permissions each role is granted by default. */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionName[]> = {
  [ROLES.ADMIN]: ALL_PERMISSIONS,
  [ROLES.MANAGER]: [
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_UPDATE,
    PERMISSIONS.PRODUCT_DELETE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.SALE_READ,
    PERMISSIONS.SALE_CANCEL,
    PERMISSIONS.SALE_RETURN,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_READ,
    PERMISSIONS.PURCHASE_UPDATE,
    PERMISSIONS.PURCHASE_RECEIVE,
    PERMISSIONS.CUSTOMER_MANAGE,
    PERMISSIONS.SUPPLIER_MANAGE,
    PERMISSIONS.REPORT_VIEW,
  ],
  [ROLES.CASHIER]: [
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.SALE_READ,
    PERMISSIONS.SALE_RETURN,
    PERMISSIONS.CUSTOMER_MANAGE,
  ],
};
