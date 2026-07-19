// Service layer for user-scoped profile, security, config, and data-management requests.
import type {
  PurgeUserDataResponse,
  UserConfigGetResponse,
  UserConfigPutRequest,
  UserConfigPutResponse,
  UserSessionResponse,
} from '@habsum/types/common/misc';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import type { UserPasswordChangeRequest } from '@habsum/types/api-responses/user-password-change';
import type { SecurityGetResponse } from '@habsum/types/api-responses/security-get';
import type {
  SecuritySessionDeleteResponse,
  SecuritySessionsDeleteOthersResponse,
} from '@habsum/types/api-responses/security-delete';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import { isForbiddenUsername } from '../forbidden-usernames.js';
import {
  isPlausibleEmail,
  isSafeConfigUserId,
  parsePin,
  parseThemePatchInput,
} from '../request-helpers.js';
import type { UserConfig } from '../types/userConfig.js';
import { ConfigService } from './config-service.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';

type UserServiceResult<T> = {
  status: number;
  body: T | { error: string };
};

type UserPatchResponse = {
  ok: true;
  username: string;
};

type UserDeleteResponse = {
  ok: true;
  username: string;
};

type LoadUserConfigResult =
  | { ok: true; config: UserConfig }
  | { ok: false; status: number; body: { error: string } };

const MAX_USERNAME_LEN = 64;

function usernameBaseFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim().toLowerCase() ?? '';
  let base = local.replace(/[^a-z0-9._-]+/g, '').replace(/^\.+|\.+$/g, '');
  if (!base) base = 'user';
  if (base.length > MAX_USERNAME_LEN) base = base.slice(0, MAX_USERNAME_LEN);
  return base;
}

export class UserService {
  constructor(
    private readonly configService = new ConfigService(),
    private readonly userAndAuthRepository = new UserAndAuthRepository(),
  ) {}

  loadUserConfig(user: string): LoadUserConfigResult {
    const invalid = this.validateUserId(user);
    if (invalid) return { ok: false, status: invalid.status, body: invalid.body };

    try {
      const config = this.configService.loadUserConfig(user);
      if (!config) {
        return { ok: false, status: 404, body: { error: 'user not found' } };
      }
      return { ok: true, config };
    } catch (e) {
      if (e instanceof ConfigService.ConfigValidationError) {
        return { ok: false, status: 400, body: { error: e.message } };
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
    const taken = new Set(this.configService.listUsers());
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

  getSecuritySessions(
    user: string,
    currentSessionId?: string,
  ): UserServiceResult<SecurityGetResponse> {
    const invalid = this.validateUserId(user);
    if (invalid) return invalid;

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

    return { status: 200, body: { sessions } };
  }

  deleteOtherSecuritySessions(
    user: string,
    currentSessionId: string | null,
  ): UserServiceResult<SecuritySessionsDeleteOthersResponse> {
    const invalid = this.validateUserId(user);
    if (invalid) return invalid;
    if (currentSessionId == null) {
      return { status: 400, body: { error: 'no active session' } };
    }

    const revoked = this.userAndAuthRepository.revokeOtherUserSessions(user, currentSessionId);
    return { status: 200, body: { ok: true, revoked } };
  }

  deleteSecuritySession(
    user: string,
    token: string,
    currentSessionId?: string,
  ): UserServiceResult<SecuritySessionDeleteResponse> {
    const invalid = this.validateUserId(user);
    if (invalid) return invalid;

    const result = this.userAndAuthRepository.revokeUserSessionByTokenPrefix(
      user,
      token,
      currentSessionId,
    );
    if (!result.ok) {
      const status =
        result.error === 'invalid token'
          ? 400
          : result.error === 'session not found'
            ? 404
            : result.error === 'ambiguous session token'
              ? 409
              : 403;
      return { status, body: { error: result.error } };
    }

    return { status: 200, body: { ok: true } };
  }

  getSession(user: string): UserServiceResult<UserSessionResponse> {
    const invalid = this.validateUserId(user);
    if (invalid) return invalid;

    const config = this.loadUserConfig(user);
    if (!config.ok) return config;
    this.userAndAuthRepository.ensureUserPins([user]);

    const profile = this.userAndAuthRepository.getUserProfile(user);
    return {
      status: 200,
      body: {
        username: user,
        admin: this.userAndAuthRepository.isUserAdmin(user),
        displayName: profile.displayName,
        theme: profile.theme,
        email: profile.email ?? '',
        createdAt: accountCreatedAtToApi(profile.createdAt),
        entitlements: this.entitlementsForUser(user),
      },
    };
  }

  changePassword(
    user: string,
    body: Partial<UserPasswordChangeRequest> | undefined,
  ): UserServiceResult<{ ok: true }> {
    const invalid = this.validateUserId(user);
    if (invalid) return invalid;

    const currentPin = parsePin(body?.currentPin);
    const newPin = parsePin(body?.newPin);
    if (currentPin == null) {
      return { status: 400, body: { error: 'current password is required' } };
    }
    if (newPin == null) {
      return { status: 400, body: { error: 'new password is required' } };
    }
    if (currentPin === newPin) {
      return {
        status: 400,
        body: { error: 'new password must be different from the current one' },
      };
    }

    const config = this.loadUserConfig(user);
    if (!config.ok) return config;
    this.userAndAuthRepository.ensureUserPins(this.configService.listUsers());

    if (!this.userAndAuthRepository.isUserPinValid(user, currentPin)) {
      return { status: 401, body: { error: 'current password is incorrect' } };
    }

    const updated = this.userAndAuthRepository.updateLoginPin(user, newPin);
    if (!updated) {
      this.userAndAuthRepository.setUserPin(user, newPin);
    }

    return { status: 200, body: { ok: true } };
  }

  patchUser(
    user: string,
    body: Partial<UsersPatchRequest> | undefined,
  ): UserServiceResult<UserPatchResponse> {
    const invalid = this.validateUserId(user);
    if (invalid) return invalid;

    const parsed = this.parseUserPatchBody(user, body ?? {});
    if ('status' in parsed) return parsed;

    const config = this.loadUserConfig(user);
    if (!config.ok) return config;
    this.userAndAuthRepository.ensureUserPins(this.configService.listUsers());

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
          return { status: 400, body: { error: 'invalid email' } };
        }
        return { status: 500, body: { error: 'failed to update profile' } };
      }
    }

    if (parsed.wantsRename) {
      const out = this.configService.renameUserConfig(user, parsed.rename);
      if (!out.ok) {
        const status = out.error.includes('already exists')
          ? 409
          : out.error === 'user not found'
            ? 404
            : 400;
        return { status, body: { error: out.error } };
      }

      this.userAndAuthRepository.renameUserPin(user, out.user);
      return { status: 200, body: { ok: true, username: out.user } };
    }

    return { status: 200, body: { ok: true, username: user } };
  }

  deleteUser(user: string): UserServiceResult<UserDeleteResponse> {
    const invalid = this.validateUserId(user);
    if (invalid) return invalid;

    try {
      this.userAndAuthRepository.purgeUserData(user);
    } catch (e) {
      return { status: 400, body: { error: e instanceof Error ? e.message : 'purge failed' } };
    }

    const out = this.configService.deleteUserConfig(user);
    if (!out.ok) {
      const status = out.error === 'user not found' ? 404 : 400;
      return { status, body: { error: out.error } };
    }

    this.userAndAuthRepository.deleteUserPin(out.user);
    return { status: 200, body: { ok: true, username: out.user } };
  }

  getUserConfig(user: string): UserServiceResult<UserConfigGetResponse> {
    return this.configService.getUserConfig({ user });
  }

  putUserConfig(
    user: string,
    body: Partial<UserConfigPutRequest> | undefined,
  ): UserServiceResult<UserConfigPutResponse> {
    return this.configService.putUserConfig({ user, body });
  }

  deleteUserData(user: string): UserServiceResult<PurgeUserDataResponse> {
    const config = this.loadUserConfig(user);
    if (!config.ok) return config;

    this.userAndAuthRepository.purgeUserData(user);
    return { status: 200, body: { ok: true, user } };
  }

  private validateUserId(user: string): UserServiceResult<never> | null {
    if (!isSafeConfigUserId(user)) {
      return { status: 400, body: { error: 'invalid user' } };
    }
    return null;
  }

  private isUsernameAvailable(candidate: string, taken: Set<string>): boolean {
    if (!isSafeConfigUserId(candidate)) return false;
    if (isForbiddenUsername(candidate)) return false;
    if (taken.has(candidate)) return false;
    return true;
  }

  private parseUserPatchBody(
    user: string,
    body: Partial<UsersPatchRequest>,
  ):
    | {
        wantsRename: boolean;
        rename: string;
        hasDisplayName: boolean;
        displayName: string | null | undefined;
        hasTheme: boolean;
        theme: string | null | undefined;
        hasEmail: boolean;
        email: string | undefined;
      }
    | UserServiceResult<never> {
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
        return { status: 400, body: { error: 'displayName must be a string or null' } };
      }
    }

    let hasTheme = false;
    let theme: string | null | undefined;
    if ('theme' in body) {
      hasTheme = true;
      const parsed = parseThemePatchInput(body.theme);
      if (parsed === 'invalid') {
        return { status: 400, body: { error: 'invalid theme' } };
      }
      theme = parsed;
    }

    let hasEmail = false;
    let email: string | undefined;
    if ('email' in body) {
      hasEmail = true;
      if (body.email === null) {
        return { status: 400, body: { error: 'email is required' } };
      }
      if (typeof body.email !== 'string') {
        return { status: 400, body: { error: 'email must be a string' } };
      }
      const t = body.email.trim().toLowerCase();
      if (t === '') {
        return { status: 400, body: { error: 'email is required' } };
      }
      if (!isPlausibleEmail(t)) {
        return { status: 400, body: { error: 'invalid email' } };
      }
      if (this.userAndAuthRepository.isEmailUsedByOtherUser(t, user)) {
        return { status: 409, body: { error: 'email already in use' } };
      }
      email = t;
    }

    if (!wantsRename && !hasDisplayName && !hasTheme && !hasEmail) {
      return { status: 400, body: { error: 'no updates provided' } };
    }

    if (wantsRename) {
      if (!isSafeConfigUserId(rename)) {
        return { status: 400, body: { error: 'invalid user' } };
      }
      if (isForbiddenUsername(rename)) {
        return { status: 400, body: { error: 'invalid username' } };
      }
      if (rename === user) {
        return { status: 400, body: { error: 'username is unchanged' } };
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
