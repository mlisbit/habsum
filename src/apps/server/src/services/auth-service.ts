// Service layer for auth route decisions, validation, and auth-related DB mutations.
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from '@habsum/types/api-responses/forgot-password-post';
import type { ResetPasswordValidateResponse } from '@habsum/types/api-responses/reset-password-get';
import type {
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '@habsum/types/api-responses/reset-password-post';
import type { OucLoginRequest, OucLoginResponse } from '@habsum/types/api-responses/ouc-post';
import type {
  LoginUserRequest,
  LoginUserResponse,
  LogoutResponse,
} from '@habsum/types/common/misc';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import { entitlementsForUser } from '../entitlements.js';
import { isDevelopment } from '../env.js';
import { isPlausibleEmail, isSafeLoginId, parsePin } from '../request-helpers.js';
import { PACKAGE_VERSION } from '../version.js';
import { ConfigService } from './config-service.js';
import { EmailService } from './email-service.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';

type AuthServiceResult<T> = {
  status: number;
  body: T | { error: string };
};

type ResetPasswordResult = AuthServiceResult<ResetPasswordResponse> & {
  sessionId?: string;
};

type LoginResult = AuthServiceResult<LoginUserResponse> & {
  sessionId?: string;
};

const GENERIC_FORGOT_PASSWORD_RESPONSE: ForgotPasswordResponse = {
  ok: true,
  message: 'If an account exists for that email, reset instructions will be sent shortly.',
};

function cleanVersion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 80 ? trimmed : null;
}

function webAndApiVersionForHeader(value: unknown): string {
  const webVersion = cleanVersion(value);
  if (!webVersion || webVersion === PACKAGE_VERSION) return PACKAGE_VERSION;
  return `web ${webVersion} / api ${PACKAGE_VERSION}`;
}

export class AuthService {
  constructor(
    private readonly configService = new ConfigService(),
    private readonly emailService = new EmailService(),
    private readonly userAndAuthRepository = new UserAndAuthRepository(),
  ) {}

  login(loginId: string, body: Partial<LoginUserRequest> | undefined): LoginResult {
    if (!isSafeLoginId(loginId)) {
      return { status: 400, body: { error: 'invalid login' } };
    }

    const pin = parsePin(body?.pin);
    if (pin == null) {
      return { status: 400, body: { error: 'pin is required' } };
    }

    const user = this.userAndAuthRepository.resolveUsernameByLoginId(loginId);
    if (!user) {
      return { status: 401, body: { error: 'invalid password' } };
    }

    try {
      const config = this.configService.loadUserConfig(user);
      if (!config) {
        return { status: 404, body: { error: 'user not found' } };
      }
    } catch (e) {
      if (e instanceof ConfigService.ConfigValidationError) {
        return { status: 400, body: { error: e.message } };
      }
      throw e;
    }

    this.userAndAuthRepository.ensureUserPins([user]);
    if (!this.userAndAuthRepository.isUserPinValid(user, pin)) {
      return { status: 401, body: { error: 'invalid password' } };
    }

    const sessionId = this.userAndAuthRepository.createUserSession(user);
    return { status: 200, body: { ok: true, user }, sessionId };
  }

  getMe(sessionId: string | null, webVersionHeader: unknown): AuthServiceResult<MeGetResponse> {
    const user = sessionId ? this.userAndAuthRepository.getUsernameForSession(sessionId) : null;
    if (!user) {
      return {
        status: 200,
        body: {
          username: null,
          displayName: null,
          theme: null,
          email: null,
          createdAt: null,
          entitlements: [],
        },
      };
    }

    this.userAndAuthRepository.ensureUserPins(this.configService.listUsers());
    this.userAndAuthRepository.recordUserLoginMetadata(
      user,
      webAndApiVersionForHeader(webVersionHeader),
    );
    const profile = this.userAndAuthRepository.getUserProfile(user);
    return {
      status: 200,
      body: {
        username: user,
        displayName: profile.displayName,
        theme: profile.theme,
        email: profile.email ?? '',
        createdAt: accountCreatedAtToApi(profile.createdAt),
        entitlements: entitlementsForUser(user),
        sessionTokenPrefix: sessionId!.slice(0, 8),
      },
    };
  }

  async forgotPassword(
    body: Partial<ForgotPasswordRequest> | undefined,
  ): Promise<AuthServiceResult<ForgotPasswordResponse>> {
    const rawEmail = body?.email;
    if (typeof rawEmail !== 'string') {
      return { status: 400, body: { error: 'email is required' } };
    }
    const email = rawEmail.trim().toLowerCase();
    if (!isPlausibleEmail(email)) {
      return { status: 400, body: { error: 'invalid email' } };
    }

    const resolvedUsername = this.resolveUsernameForPasswordReset(email);
    if (!resolvedUsername && isDevelopment()) {
      console.log(`[habsum] forgot-password: no account for ${email} (generic success returned)`);
    }
    if (!resolvedUsername) {
      return { status: 200, body: GENERIC_FORGOT_PASSWORD_RESPONSE };
    }

    const retryAfterSeconds =
      this.userAndAuthRepository.passwordResetRetryAfterSeconds(resolvedUsername);
    if (retryAfterSeconds > 0) {
      return {
        status: 200,
        body: {
          ok: true,
          message: 'please wait a little while longer',
          timeout: retryAfterSeconds,
        },
      };
    }

    const { token, id: tokenId } = this.userAndAuthRepository.issuePasswordResetToken(
      resolvedUsername,
      'reset',
    );
    try {
      await this.emailService.sendPasswordResetEmail(resolvedUsername, email, token);
      this.userAndAuthRepository.recordPasswordResetRequest(resolvedUsername);
    } catch (e) {
      this.userAndAuthRepository.consumePasswordResetToken(tokenId);
      console.error('[habsum] failed to send password reset email', e);
      return { status: 503, body: { error: 'Something went wrong with your request' } };
    }

    return { status: 200, body: GENERIC_FORGOT_PASSWORD_RESPONSE };
  }

  validateResetPassword(token: unknown): AuthServiceResult<ResetPasswordValidateResponse> {
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    if (!normalizedToken) {
      return { status: 400, body: { error: 'token is required' } };
    }

    const row = this.userAndAuthRepository.lookupValidPasswordResetToken(normalizedToken);
    if (!row) {
      return { status: 400, body: { error: 'invalid or expired reset link' } };
    }

    return {
      status: 200,
      body: {
        ok: true,
        purpose: row.purpose,
        ...(row.purpose === 'invite'
          ? { displayName: this.userAndAuthRepository.getUserProfile(row.userId).displayName }
          : {}),
      },
    };
  }

  resetPassword(body: Partial<ResetPasswordRequest> | undefined): ResetPasswordResult {
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return { status: 400, body: { error: 'token is required' } };
    }

    const newPin = parsePin(body?.newPin);
    if (newPin == null) {
      return { status: 400, body: { error: 'new password is required' } };
    }

    const row = this.userAndAuthRepository.lookupValidPasswordResetToken(token);
    if (!row) {
      return { status: 400, body: { error: 'invalid or expired reset link' } };
    }

    if (!this.userAndAuthRepository.isNewLoginPasswordAllowed(row.userId, newPin)) {
      return {
        status: 400,
        body: { error: 'new password must be different from the current one' },
      };
    }

    if (!this.userAndAuthRepository.consumePasswordResetToken(row.id)) {
      return { status: 400, body: { error: 'invalid or expired reset link' } };
    }

    this.userAndAuthRepository.resetLoginPassword(row.userId, newPin);

    if (row.purpose === 'invite') {
      this.userAndAuthRepository.ensureUserPins([row.userId]);
      const sessionId = this.userAndAuthRepository.createUserSession(row.userId);
      return { status: 200, body: { ok: true, user: row.userId }, sessionId };
    }

    return { status: 200, body: { ok: true } };
  }

  loginWithOuc(body: Partial<OucLoginRequest> | undefined): AuthServiceResult<OucLoginResponse> {
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token || !this.userAndAuthRepository.isOucSessionId(token)) {
      return { status: 400, body: { error: 'invalid token' } };
    }

    const user = this.userAndAuthRepository.getUsernameForSession(token);
    if (!user) {
      return { status: 401, body: { error: 'invalid or expired token' } };
    }

    return { status: 200, body: { ok: true, user } };
  }

  logoutOuc(token: string | null): AuthServiceResult<LogoutResponse> {
    if (token && this.userAndAuthRepository.isOucSessionId(token)) {
      this.userAndAuthRepository.revokeUserSession(token);
    }
    return { status: 200, body: { ok: true } };
  }

  logout(sessionId: string | null): AuthServiceResult<LogoutResponse> {
    if (sessionId) this.userAndAuthRepository.revokeUserSession(sessionId);
    return { status: 200, body: { ok: true } };
  }

  private resolveUsernameForPasswordReset(email: string): string | null {
    return this.userAndAuthRepository.resolveUsernameByLoginId(email);
  }
}
