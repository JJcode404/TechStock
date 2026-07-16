/**
 * Auth repository — the ONLY layer that talks to Prisma for users, sessions and
 * refresh tokens. Contains no business logic; just data access.
 */
import type { Prisma, PrismaClient, RefreshToken, Session, User } from '@prisma/client';
import { prisma as defaultPrisma } from '../database/prisma.js';

export interface UserWithRole extends User {
  role: { id: string; name: string; permissions: { permission: { name: string } }[] };
}

export class AuthRepository {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  findUserByIdentifier(identifier: string): Promise<UserWithRole | null> {
    const value = identifier.toLowerCase();
    return this.db.user.findFirst({
      where: {
        isDeleted: false,
        OR: [{ email: value }, { username: value }],
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    }) as Promise<UserWithRole | null>;
  }

  findUserById(id: string): Promise<UserWithRole | null> {
    return this.db.user.findFirst({
      where: { id, isDeleted: false },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    }) as Promise<UserWithRole | null>;
  }

  findRoleByName(name: string): Promise<{ id: string } | null> {
    return this.db.role.findUnique({ where: { name }, select: { id: true } });
  }

  createUser(data: Prisma.UserCreateInput): Promise<UserWithRole> {
    return this.db.user.create({
      data,
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    }) as Promise<UserWithRole>;
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({ where: { id }, data });
  }

  touchLastLogin(id: string): Promise<User> {
    return this.db.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  createSession(data: Prisma.SessionUncheckedCreateInput): Promise<Session> {
    return this.db.session.create({ data });
  }

  findSessionById(id: string): Promise<Session | null> {
    return this.db.session.findUnique({ where: { id } });
  }

  touchSession(id: string): Promise<Session> {
    return this.db.session.update({ where: { id }, data: { lastActiveAt: new Date() } });
  }

  revokeSession(id: string): Promise<Prisma.BatchPayload> {
    return this.db.session.updateMany({ where: { id }, data: { isRevoked: true } });
  }

  revokeAllUserSessions(userId: string): Promise<Prisma.BatchPayload> {
    return this.db.session.updateMany({ where: { userId }, data: { isRevoked: true } });
  }

  createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return this.db.refreshToken.create({ data });
  }

  findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeRefreshToken(id: string, replacedById?: string): Promise<RefreshToken> {
    return this.db.refreshToken.update({
      where: { id },
      data: { isRevoked: true, ...(replacedById ? { replacedById } : {}) },
    });
  }

  revokeAllUserRefreshTokens(userId: string): Promise<Prisma.BatchPayload> {
    return this.db.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}

export const authRepository = new AuthRepository();
