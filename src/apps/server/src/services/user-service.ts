// Domain operations for user profiles, security, configuration, and data management.
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import hasOnlyUsernameCharacters from '../utils/has-only-username-characters.js';
import isForbiddenUsername from '@habsum/utils/is-forbidden-username';
import { generateTemporaryPassword } from '@habsum/utils/password';
import {
  isPlausibleEmail,
  isSafeConfigUserId,
  getPassword,
  getThemePatchInput,
} from '../utils/request-utils.js';
import type { UserConfig } from '../types/userConfig.js';
import { ConfigService } from './config-service.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import ServiceError from '../utils/classes/service-error.js';
import restrictForDemo from '../utils/restrict-for-demo.js';

type UserPatchResult = {
  ok: true;
  username: string;
};

type UserDeleteResult = {
  ok: true;
  username: string;
};

type PasswordChangeInput = { currentPassword?: unknown; newPassword?: unknown };
type UserPatchInput = {
  username?: unknown;
  displayName?: unknown;
  theme?: unknown;
  email?: unknown;
};
type UserConfigInput = {
  text?: unknown;
  config?: unknown;
  migrations?: unknown;
  deletions?: unknown;
};

const MAX_USERNAME_LEN = 64;

function usernameBaseFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim().toLowerCase() ?? '';
  let base = local.replace(/[^a-z0-9]+/g, '');
  if (!base) base = 'user';
  if (base.length > MAX_USERNAME_LEN) base = base.slice(0, MAX_USERNAME_LEN);
  return base;
}

export class UserService {
  constructor(
    private readonly configService = new ConfigService(),
    private readonly userAndAuthRepository = new UserAndAuthRepository(),
  ) {}

  loadUserConfig(user: string): UserConfig {
    this.assertValidUserId(user);

    try {
      const config = this.configService.loadUserConfig(user);
      if (!config) {
        throw new ServiceError('not_found', 'user not found');
      }
      return config;
    } catch (e) {
      if (e instanceof ConfigService.ConfigValidationError) {
        throw new ServiceError('bad_request', e.message);
      }
      throw e;
    }
  }

  entitlementsForUser(username: string): ProductEntitlement[] {
    const out: ProductEntitlement[] = [];
    if (this.userAndAuthRepository.getFirstDate(username) === null) {
      out.push(ProductEntitlement.NEW_USER);
    }
    if (this.userAndAuthRepository.isUserBetaTester(username)) {
      out.push(ProductEntitlement.BETA_TESTER);
    }
    if (this.userAndAuthRepository.isUserAdmin(username)) {
      out.push(ProductEntitlement.DEVELOPER);
    }
    return out;
  }

  allocateUsernameForEmail(email: string): string | null {
    const taken = new Set([
      ...this.configService.listConfiguredUsers(),
      ...this.userAndAuthRepository.listUserRows().map((row) => row.username),
    ]);
    let base = usernameBaseFromEmail(email);
    if (!this.isUsernameAvailable(base, taken)) {
      base = isForbiddenUsername(base) || !isSafeConfigUserId(base) ? 'user' : base;
    }

    if (this.isUsernameAvailable(base, taken)) return base;

    for (let n = 2; n < 10_000; n++) {
      const suffix = String(n);
      const maxBase = MAX_USERNAME_LEN - suffix.length;
      const candidate = `${base.slice(0, maxBase)}${suffix}`;
      if (this.isUsernameAvailable(candidate, taken)) return candidate;
    }

    return null;
  }

  getSecuritySessions(user: string, currentSessionId?: string) {
    this.assertValidUserId(user);

    const now = Date.now();
    const sessions = this.userAndAuthRepository.listSessionsForUsername(user).map((row) => ({
      token: row.id.slice(0, 8),
      createdAt: accountCreatedAtToApi(row.created_at),
      expiresAt: accountCreatedAtToApi(row.expires_at),
      isActive:
        currentSessionId != null &&
        currentSessionId === row.id &&
        new Date(row.expires_at).getTime() > now,
    }));

    return { sessions };
  }

  deleteOtherSecuritySessions(user: string, currentSessionId: string | null) {
    this.assertValidUserId(user);
    if (currentSessionId == null) {
      throw new ServiceError('bad_request', 'no active session');
    }

    const revoked = this.userAndAuthRepository.revokeOtherUserSessions(user, currentSessionId);
    return { ok: true as const, revoked };
  }

  deleteSecuritySession(user: string, token: string, currentSessionId?: string) {
    this.assertValidUserId(user);

    const result = this.userAndAuthRepository.revokeUserSessionByTokenPrefix(
      user,
      token,
      currentSessionId,
    );
    if (!result.ok) {
      const kind =
        result.error === 'invalid token'
          ? 'bad_request'
          : result.error === 'session not found'
            ? 'not_found'
            : result.error === 'ambiguous session token'
              ? 'conflict'
              : 'forbidden';
      throw new ServiceError(kind, result.error);
    }

    return { ok: true as const };
  }

  @restrictForDemo()
  changePassword(user: string, body: PasswordChangeInput | undefined) {
    this.assertValidUserId(user);

    const currentPassword = getPassword(body?.currentPassword);
    const newPassword = getPassword(body?.newPassword);
    if (currentPassword == null) {
      throw new ServiceError('bad_request', 'current password is required');
    }
    if (newPassword == null) {
      throw new ServiceError('bad_request', 'new password is required');
    }
    if (currentPassword === newPassword) {
      throw new ServiceError('bad_request', 'new password must be different from the current one');
    }

    this.loadUserConfig(user);
    if (!this.userAndAuthRepository.isUserPasswordValid(user, currentPassword)) {
      throw new ServiceError('unauthorized', 'current password is incorrect');
    }

    if (!this.userAndAuthRepository.updateLoginPassword(user, newPassword)) {
      throw new ServiceError('not_found', 'user not found');
    }

    return { ok: true as const };
  }

  @restrictForDemo()
  issueTemporaryPassword(user: string) {
    this.assertValidUserId(user);
    const password = generateTemporaryPassword();
    if (!this.userAndAuthRepository.updateLoginPassword(user, password)) {
      throw new ServiceError('not_found', 'user not found');
    }
    return { ok: true as const, user, password };
  }

  @restrictForDemo(
    (_user: string, body: UserPatchInput | undefined) =>
      body != null && ('username' in body || 'displayName' in body || 'email' in body),
  )
  patchUser(user: string, body: UserPatchInput | undefined): UserPatchResult {
    this.assertValidUserId(user);

    const parsed = this.parseUserPatchBody(user, body ?? {});
    this.loadUserConfig(user);
    if (parsed.hasDisplayName || parsed.hasTheme || parsed.hasEmail) {
      try {
        this.userAndAuthRepository.patchUserProfile(user, {
          ...(parsed.hasDisplayName ? { displayName: parsed.displayName } : {}),
          ...(parsed.hasTheme ? { theme: parsed.theme } : {}),
          ...(parsed.hasEmail ? { email: parsed.email } : {}),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'invalid email') {
          throw new ServiceError('bad_request', 'invalid email');
        }
        throw new ServiceError('internal', 'failed to update profile');
      }
    }

    if (parsed.wantsRename) {
      const out = this.configService.renameUserConfig(user, parsed.rename);
      if (!out.ok) {
        const kind = out.error.includes('already exists')
          ? 'conflict'
          : out.error === 'user not found'
            ? 'not_found'
            : 'bad_request';
        throw new ServiceError(kind, out.error);
      }

      this.userAndAuthRepository.renameUserAuthRecord(user, out.user);
      return { ok: true, username: out.user };
    }

    return { ok: true, username: user };
  }

  @restrictForDemo()
  deleteUser(user: string): UserDeleteResult {
    this.assertValidUserId(user);

    try {
      this.userAndAuthRepository.purgeUserData(user);
    } catch (e) {
      throw new ServiceError('bad_request', e instanceof Error ? e.message : 'purge failed');
    }

    const out = this.configService.deleteUserConfig(user);
    if (!out.ok) {
      throw new ServiceError(
        out.error === 'user not found' ? 'not_found' : 'bad_request',
        out.error,
      );
    }

    this.userAndAuthRepository.deleteUserAuthRecord(out.user);
    return { ok: true, username: out.user };
  }

  getUserConfig(user: string) {
    return this.configService.getUserConfig({ user });
  }

  putUserConfig(user: string, body: UserConfigInput | undefined) {
    return this.configService.putUserConfig({ user, body });
  }

  private assertValidUserId(user: string): void {
    if (!isSafeConfigUserId(user)) {
      throw new ServiceError('bad_request', 'invalid user');
    }
  }

  private isUsernameAvailable(candidate: string, taken: Set<string>): boolean {
    if (!isSafeConfigUserId(candidate)) return false;
    if (!hasOnlyUsernameCharacters(candidate)) return false;
    if (isForbiddenUsername(candidate)) return false;
    if (taken.has(candidate)) return false;
    return true;
  }

  private parseUserPatchBody(
    user: string,
    body: UserPatchInput,
  ): {
    wantsRename: boolean;
    rename: string;
    hasDisplayName: boolean;
    displayName: string | null | undefined;
    hasTheme: boolean;
    theme: string | null | undefined;
    hasEmail: boolean;
    email: string | undefined;
  } {
    const rename = typeof body.username === 'string' ? body.username.trim() : '';
    const wantsRename = rename.length > 0;

    let hasDisplayName = false;
    let displayName: string | null | undefined;
    if ('displayName' in body) {
      hasDisplayName = true;
      if (body.displayName === null) {
        displayName = null;
      } else if (typeof body.displayName === 'string') {
        displayName = body.displayName.trim() || null;
      } else {
        throw new ServiceError('bad_request', 'displayName must be a string or null');
      }
    }

    let hasTheme = false;
    let theme: string | null | undefined;
    if ('theme' in body) {
      hasTheme = true;
      const parsed = getThemePatchInput(body.theme);
      if (parsed === 'invalid') {
        throw new ServiceError('bad_request', 'invalid theme');
      }
      theme = parsed;
    }

    let hasEmail = false;
    let email: string | undefined;
    if ('email' in body) {
      hasEmail = true;
      if (body.email === null) {
        throw new ServiceError('bad_request', 'email is required');
      }
      if (typeof body.email !== 'string') {
        throw new ServiceError('bad_request', 'email must be a string');
      }
      const t = body.email.trim().toLowerCase();
      if (t === '') {
        throw new ServiceError('bad_request', 'email is required');
      }
      if (!isPlausibleEmail(t)) {
        throw new ServiceError('bad_request', 'invalid email');
      }
      if (this.userAndAuthRepository.isEmailUsedByOtherUser(t, user)) {
        throw new ServiceError('conflict', 'email already in use');
      }
      email = t;
    }

    if (!wantsRename && !hasDisplayName && !hasTheme && !hasEmail) {
      throw new ServiceError('bad_request', 'no updates provided');
    }

    if (wantsRename) {
      if (!isSafeConfigUserId(rename)) {
        throw new ServiceError('bad_request', 'invalid user');
      }
      if (isForbiddenUsername(rename)) {
        throw new ServiceError('bad_request', 'invalid username');
      }
      if (rename === user) {
        throw new ServiceError('bad_request', 'username is unchanged');
      }
    }

    return {
      wantsRename,
      rename,
      hasDisplayName,
      displayName,
      hasTheme,
      theme,
      hasEmail,
      email,
    };
  }
}
