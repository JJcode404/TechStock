/**
 * Database seed.
 *
 * Idempotent: provisions the RBAC tables (roles + permissions + mappings),
 * a default admin user, and baseline settings. Safe to run repeatedly.
 *
 * Run: npm run db:seed
 */
import { prisma } from '../src/database/prisma.js';
import { logger } from '../src/config/logger.js';
import { env } from '../src/config/env.js';
import { hashPassword } from '../src/utils/password.js';
import {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  type PermissionName,
  type RoleName,
} from '../src/constants/index.js';

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [ROLES.ADMIN]: 'Full system access',
  [ROLES.MANAGER]: 'Manage catalog, inventory, sales, purchases and reports',
  [ROLES.CASHIER]: 'Operate the POS: create sales and manage customers',
};

const PERMISSION_DESCRIPTIONS: Partial<Record<PermissionName, string>> = {
  [PERMISSIONS.PRODUCT_CREATE]: 'Create products',
  [PERMISSIONS.SALE_CREATE]: 'Create sales at the POS',
  [PERMISSIONS.PURCHASE_RECEIVE]: 'Receive purchase orders into stock',
  [PERMISSIONS.USER_MANAGE]: 'Create and manage users',
};

async function seedPermissions(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const name of Object.values(PERMISSIONS)) {
    const perm = await prisma.permission.upsert({
      where: { name },
      update: { description: PERMISSION_DESCRIPTIONS[name] ?? name },
      create: { name, description: PERMISSION_DESCRIPTIONS[name] ?? name },
    });
    map.set(name, perm.id);
  }
  logger.info(`Seeded ${map.size} permissions`);
  return map;
}

async function seedRoles(permIds: Map<string, string>): Promise<Map<RoleName, string>> {
  const roleIds = new Map<RoleName, string>();
  for (const roleName of Object.values(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName], isSystem: true },
      create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName], isSystem: true },
    });
    roleIds.set(roleName, role.id);

    // Reset and reassign permission mappings to match ROLE_PERMISSIONS.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const perms = ROLE_PERMISSIONS[roleName];
    await prisma.rolePermission.createMany({
      data: perms
        .map((p) => permIds.get(p))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  logger.info(`Seeded ${roleIds.size} roles`);
  return roleIds;
}

async function seedAdmin(adminRoleId: string): Promise<void> {
  const email = 'admin@techstock.local';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info('Admin user already exists, skipping');
    return;
  }
  const passwordHash = await hashPassword('Admin@12345');
  await prisma.user.create({
    data: {
      email,
      username: 'admin',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      roleId: adminRoleId,
    },
  });
  logger.info(`Created admin user: ${email} / Admin@12345 (change this immediately!)`);
}

async function seedSettings(): Promise<void> {
  const settings = [
    { key: 'store.name', value: 'TechStock Store', isPublic: true },
    { key: 'store.currency', value: env.DEFAULT_CURRENCY, isPublic: true },
    { key: 'store.taxRate', value: String(env.DEFAULT_TAX_RATE), type: 'NUMBER' as const },
    { key: 'store.receiptFooter', value: 'Thank you for shopping with us!', isPublic: true },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value, type: s.type ?? 'STRING', isPublic: s.isPublic ?? false },
    });
  }
  logger.info(`Seeded ${settings.length} settings`);
}

async function main(): Promise<void> {
  logger.info('🌱 Seeding database...');
  const permIds = await seedPermissions();
  const roleIds = await seedRoles(permIds);
  const adminRoleId = roleIds.get(ROLES.ADMIN);
  if (adminRoleId) await seedAdmin(adminRoleId);
  await seedSettings();
  logger.info('✅ Seeding complete');
}

main()
  .catch((err) => {
    logger.error({ err }, 'Seeding failed');
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
