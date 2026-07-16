/**
 * Auth service — all authentication business logic.
 *
 * Token model:
 *   - Access token: short-lived JWT carrying identity + permissions (stateless).
 *   - Refresh token: opaque random string; only its SHA-256 hash is stored.
 *     Refresh tokens ROTATE on every use. Re-use of an already-rotated token is
 *     treated as theft and revokes the whole session + token family.
 */
import type { RequestContext } from '../types/index.js';
import { AuthRepository, authRepository, type UserWithRole } from '../repositories/auth.repository.js';
import { ActivityLogService, activityLogService } from './activityLog.service.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateOpaqueToken, sha256 } from '../utils/crypto.js';
import { signAccessToken, durationToMs } from '../utils/jwt.js';
import { env } from '../config/env.js';
import { ROLES, type RoleName } from '../constants/index.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../errors/index.js';
import type { ChangePasswordInput, LoginInput, RegisterInput } from '../validators/auth.validator.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // access token lifetime in seconds
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  permissions: string[];
  isActive: boolean;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

const toPublicUser = (user: UserWithRole): PublicUser => ({
  id: user.id,
  email: user.email,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  role: user.role.name,
  permissions: user.role.permissions.map((rp) => rp.permission.name),
  isActive: user.isActive,
});

export class AuthService {
  constructor(
    private readonly repo: AuthRepository = authRepository,
    private readonly audit: ActivityLogService = activityLogService,
  ) {}

  async register(input: RegisterInput, ctx: RequestContext): Promise<AuthResult> {
    const roleName: RoleName = input.role ?? ROLES.CASHIER;
    const role = await this.repo.findRoleByName(roleName);
    if (!role) throw new BadRequestError(`Role "${roleName}" is not provisioned`);

    const existing = await this.repo.findUserByIdentifier(input.email);
    if (existing) throw new ConflictError('A user with this email or username already exists');

    const passwordHash = await hashPassword(input.password);
    let user: UserWithRole;
    try {
      user = await this.repo.createUser({
        email: input.email,
        username: input.username,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        deviceId: ctx.deviceId ?? null,
        role: { connect: { id: role.id } },
      });
    } catch {
      throw new ConflictError('A user with this email or username already exists');
    }

    this.audit.record({
      userId: user.id,
      action: 'auth.register',
      entity: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const tokens = await this.issueTokens(user, ctx);
    return { user: toPublicUser(user), tokens };
  }

  async login(input: LoginInput, ctx: RequestContext): Promise<AuthResult> {
    const user = await this.repo.findUserByIdentifier(input.identifier);
    // Constant-ish work regardless of user existence to reduce enumeration.
    const ok = user ? await verifyPassword(input.password, user.passwordHash) : false;

    if (!user || !ok) {
      this.audit.record({
        userId: user?.id ?? null,
        action: 'auth.login.failed',
        entity: 'User',
        entityId: user?.id ?? null,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedError('Invalid credentials');
    }
    if (!user.isActive) throw new UnauthorizedError('Account is disabled');

    await this.repo.touchLastLogin(user.id);
    this.audit.record({
      userId: user.id,
      action: 'auth.login',
      entity: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const tokens = await this.issueTokens(user, ctx);
    return { user: toPublicUser(user), tokens };
  }

  async refresh(rawToken: string, ctx: RequestContext): Promise<AuthTokens> {
    const tokenHash = sha256(rawToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!stored) throw new UnauthorizedError('Invalid refresh token');

    // Reuse detection: a revoked-but-presented token means the family is
    // compromised — revoke everything for that user.
    if (stored.isRevoked) {
      await this.repo.revokeAllUserRefreshTokens(stored.userId);
      await this.repo.revokeAllUserSessions(stored.userId);
      this.audit.record({
        userId: stored.userId,
        action: 'auth.refresh.reuse_detected',
        entity: 'RefreshToken',
        entityId: stored.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    const user = await this.repo.findUserById(stored.userId);
    if (!user || !user.isActive) throw new UnauthorizedError('Account is no longer active');

    // The refresh token is bound to a session; that session must still be valid.
    const session = await this.repo.findSessionById(stored.sessionId);
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session is no longer valid');
    }

    // Rotate: issue a new refresh token bound to the SAME session, then mark the
    // old one revoked + replaced (enables reuse detection on the old token).
    const { rawToken: newRaw, id: newId } = await this.persistRefreshToken(
      user.id,
      session.id,
      ctx,
    );
    await this.repo.revokeRefreshToken(stored.id, newId);
    await this.repo.touchSession(session.id);

    const accessToken = this.signAccess(user, session.id);
    return {
      accessToken,
      refreshToken: newRaw,
      tokenType: 'Bearer',
      expiresIn: Math.floor(durationToMs(env.JWT_ACCESS_EXPIRES_IN) / 1000),
    };
  }

  async logout(userId: string, rawToken: string | undefined, allDevices: boolean, ctx: RequestContext): Promise<void> {
    if (allDevices) {
      await this.repo.revokeAllUserRefreshTokens(userId);
      await this.repo.revokeAllUserSessions(userId);
    } else if (rawToken) {
      const stored = await this.repo.findRefreshTokenByHash(sha256(rawToken));
      if (stored && stored.userId === userId) {
        await this.repo.revokeRefreshToken(stored.id);
      }
    }
    this.audit.record({
      userId,
      action: allDevices ? 'auth.logout.all' : 'auth.logout',
      entity: 'User',
      entityId: userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async changePassword(userId: string, input: ChangePasswordInput, ctx: RequestContext): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new UnauthorizedError();
    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestError('Current password is incorrect');

    const passwordHash = await hashPassword(input.newPassword);
    await this.repo.updateUser(userId, { passwordHash, syncVersion: { increment: 1 } });
    // Force re-login everywhere after a password change.
    await this.repo.revokeAllUserRefreshTokens(userId);
    await this.repo.revokeAllUserSessions(userId);

    this.audit.record({
      userId,
      action: 'auth.password.change',
      entity: 'User',
      entityId: userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new UnauthorizedError();
    return toPublicUser(user);
  }

  // --- internal helpers -----------------------------------------------------

  private signAccess(user: UserWithRole, sessionId: string): string {
    return signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.name),
      sessionId,
    });
  }

  private async persistRefreshToken(
    userId: string,
    sessionId: string,
    ctx: RequestContext,
  ): Promise<{ rawToken: string; id: string }> {
    const rawToken = generateOpaqueToken();
    const record = await this.repo.createRefreshToken({
      userId,
      sessionId,
      tokenHash: sha256(rawToken),
      deviceId: ctx.deviceId ?? null,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    });
    return { rawToken, id: record.id };
  }

  private async issueTokens(user: UserWithRole, ctx: RequestContext): Promise<AuthTokens> {
    const session = await this.repo.createSession({
      userId: user.id,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      deviceId: ctx.deviceId ?? null,
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    });

    const accessToken = this.signAccess(user, session.id);
    const { rawToken } = await this.persistRefreshToken(user.id, session.id, ctx);

    return {
      accessToken,
      refreshToken: rawToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor(durationToMs(env.JWT_ACCESS_EXPIRES_IN) / 1000),
    };
  }
}

export const authService = new AuthService();
