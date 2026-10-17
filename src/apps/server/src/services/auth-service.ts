// Domain operations for authentication, sessions, and password recovery.
import type { ApplicationGetResponse } from '@habsum/types/api-responses/application-get';
import getInitialWebSignupStatus from '../utils/get-initial-web-signup-status.js';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import { getPasswordResetUrl, PASSWORD_RESET_TOKEN_TTL_SECONDS } from '@habsum/utils/password';
import isDevelopment from '../utils/is-development.js';
import { getPassword, isPlausibleEmail, isSafeLoginId } from '../utils/request-utils.js';
import getPackageVersion from '../utils/get-package-version.js';
import { ConfigService } from './config-service.js';
import { EmailService } from './email-service.js';
import { UserService } from './user-service.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import ServiceError from '../utils/classes/service-error.js';
import { RegistrationSettingsRepository } from '../repositories/registration-settings-repository.js';
import { EmailSettingsRepository } from '../repositories/email-settings-repository.js';
import isForbiddenUsername from '@habsum/utils/is-forbidden-username';
import restrictForDemo from '../utils/restrict-for-demo.js';

const PACKAGE_VERSION = getPackageVersion();

type LoginInput = { password?: unknown };
type SignupInput = { email?: unknown; password?: unknown };
type ForgotPasswordInput = { email?: unknown };
type ResetPasswordInput = { token?: unknown; newPassword?: unknown };
type OucLoginInput = { token?: unknown };
type InitialUserInput = { username?: unknown; password?: unknown };

const GENERIC_FORGOT_PASSWORD_RESULT = {
  ok: true,
  message: 'If an account exists for that email, reset instructions will be sent shortly.',
} as const;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function passwordResetEmailContent(
  resetUrl: string,
  greetingName: string,
): {
  subject: string;
  html: string;
  text: string;
} {
  const ttlMinutes = Math.round(PASSWORD_RESET_TOKEN_TTL_SECONDS / 60);
  const safeGreetingName = escapeHtml(greetingName);
  return {
    subject: 'Reset your Habsum password',
    html: `<p>Hello ${safeGreetingName},</p>
<p>We received a request to reset your Habsum password.</p>
<p><a href="${resetUrl}">Reset your password</a></p>
<p>This link expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.</p>`,
    text: `Hello ${greetingName},

We received a request to reset your Habsum password.

Reset your password: ${resetUrl}

This link expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.`,
  };
}

function inviteEmailContent(
  displayName: string,
  setupUrl: string,
): {
  subject: string;
  html: string;
  text: string;
} {
  const safeDisplayName = escapeHtml(displayName);
  return {
    subject: "You're invited to Habsum",
    html: `<p>Hi ${safeDisplayName},</p>
<p>You've been invited to Habsum - a habit tracking app for building routines that last.</p>
<p><a href="${setupUrl}">Set up your account</a></p>
<p>This link expires in 7 days.</p>`,
    text: `Hi ${displayName},

You've been invited to Habsum - a habit tracking app for building routines that last.

Set up your account: ${setupUrl}

This link expires in 7 days.`,
  };
}

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
    private readonly userService = new UserService(configService, userAndAuthRepository),
    private readonly registrationSettingsRepository = new RegistrationSettingsRepository(),
    private readonly emailSettingsRepository = new EmailSettingsRepository(),
  ) {}

  getStatus(): Pick<ApplicationGetResponse, 'apiVersion' | 'redirectPath' | 'features'> {
    const { enabled } = getInitialWebSignupStatus(this.userAndAuthRepository.hasUsers());
    const emailSettings = this.emailSettingsRepository.getResendSettings();
    return {
      apiVersion: PACKAGE_VERSION,
      redirectPath: enabled ? '/welcome' : null,
      features: {
        accountSignup: this.registrationSettingsRepository.isAccountSignupEnabled(),
        forgotPassword: Boolean(emailSettings?.apiKey.trim() && emailSettings?.fromEmail.trim()),
      },
    };
  }

  // Initial web signup requires explicit opt-in, independently of public registration settings.
  createInitialUser(body: InitialUserInput | undefined) {
    if (this.userAndAuthRepository.hasUsers()) {
      throw new ServiceError('conflict', 'the initial user already exists');
    }

    if (!getInitialWebSignupStatus(false).enabled) {
      throw new ServiceError('forbidden', 'initial web signup is disabled');
    }

    if (typeof body?.username !== 'string' || body.username.trim() === '') {
      throw new ServiceError('bad_request', 'username is required');
    }
    const username = body.username.trim();
    if (!isSafeLoginId(username) || isForbiddenUsername(username)) {
      throw new ServiceError('bad_request', 'invalid username');
    }

    const password = getPassword(body.password);
    if (password == null) {
      throw new ServiceError('bad_request', 'password is required');
    }

    const configResult = this.configService.createEmptyUserConfig(username);
    if (!configResult.ok) {
      throw new ServiceError(
        configResult.error.includes('already exists') ? 'conflict' : 'bad_request',
        configResult.error,
      );
    }

    let created: boolean;
    try {
      created = this.userAndAuthRepository.createFirstAdminUser(username, password);
    } catch (error) {
      this.configService.deleteUserConfig(username);
      throw new ServiceError(
        'internal',
        error instanceof Error ? error.message : 'failed to create initial user',
      );
    }

    if (!created) {
      this.configService.deleteUserConfig(username);
      throw new ServiceError('conflict', 'the initial user already exists');
    }

    const sessionId = this.userAndAuthRepository.createUserSession(username);
    return { data: { ok: true as const, user: username }, sessionId };
  }

  signup(body: SignupInput | undefined) {
    if (!this.registrationSettingsRepository.isAccountSignupEnabled()) {
      throw new ServiceError('forbidden', 'account creation is disabled');
    }

    const rawEmail = body?.email;
    if (typeof rawEmail !== 'string') {
      throw new ServiceError('bad_request', 'email is required');
    }
    const email = rawEmail.trim().toLowerCase();
    if (!isPlausibleEmail(email)) {
      throw new ServiceError('bad_request', 'invalid email');
    }

    const password = getPassword(body?.password);
    if (password == null) {
      throw new ServiceError('bad_request', 'password is required');
    }
    if (this.userAndAuthRepository.resolveUsernameByLoginId(email)) {
      throw new ServiceError('conflict', 'email already in use');
    }

    const username = this.userService.allocateUsernameForEmail(email);
    if (!username) {
      throw new ServiceError('conflict', 'could not allocate username');
    }

    const configResult = this.configService.createEmptyUserConfig(username);
    if (!configResult.ok) {
      throw new ServiceError(
        configResult.error.includes('already exists') ? 'conflict' : 'bad_request',
        configResult.error,
      );
    }

    try {
      this.userAndAuthRepository.setUserPassword(username, password);
      this.userAndAuthRepository.patchUserProfile(username, { email });
    } catch (error) {
      this.configService.deleteUserConfig(username);
      this.userAndAuthRepository.deleteUserAuthRecord(username);
      const message = error instanceof Error ? error.message : 'failed to create account';
      if (message.includes('UNIQUE constraint failed: users.email')) {
        throw new ServiceError('conflict', 'email already in use');
      }
      throw new ServiceError('internal', message);
    }

    const sessionId = this.userAndAuthRepository.createUserSession(username);
    return { data: { ok: true as const, user: username }, sessionId };
  }

  login(loginId: string, body: LoginInput | undefined) {
    if (!isSafeLoginId(loginId)) {
      throw new ServiceError('bad_request', 'invalid login');
    }

    const password = getPassword(body?.password);
    if (password == null) {
      throw new ServiceError('bad_request', 'password is required');
    }

    const user = this.userAndAuthRepository.resolveUsernameByLoginId(loginId);
    if (!user) {
      throw new ServiceError('unauthorized', 'invalid password');
    }

    try {
      const config = this.configService.loadUserConfig(user);
      if (!config) {
        throw new ServiceError('not_found', 'user not found');
      }
    } catch (e) {
      if (e instanceof ConfigService.ConfigValidationError) {
        throw new ServiceError('bad_request', e.message);
      }
      throw e;
    }

    if (!this.userAndAuthRepository.isUserPasswordValid(user, password)) {
      throw new ServiceError('unauthorized', 'invalid password');
    }

    const sessionId = this.userAndAuthRepository.createUserSession(user);
    return { data: { ok: true as const, user }, sessionId };
  }

  getMe(sessionId: string | null, webVersionHeader: unknown) {
    const user = sessionId ? this.userAndAuthRepository.getUsernameForSession(sessionId) : null;
    if (!user) {
      return {
        username: null,
        displayName: null,
        theme: null,
        email: null,
        createdAt: null,
        entitlements: [] as [],
      };
    }

    this.userAndAuthRepository.recordUserLoginMetadata(
      user,
      webAndApiVersionForHeader(webVersionHeader),
    );
    const profile = this.userAndAuthRepository.getUserProfile(user);
    return {
      username: user,
      displayName: profile.displayName,
      theme: profile.theme,
      email: profile.email ?? '',
      admin: this.userAndAuthRepository.isUserAdmin(user),
      createdAt: accountCreatedAtToApi(profile.createdAt),
      entitlements: this.userService.entitlementsForUser(user),
      sessionTokenPrefix: sessionId!.slice(0, 8),
    };
  }

  @restrictForDemo()
  async forgotPassword(body: ForgotPasswordInput | undefined) {
    if (!this.getStatus().features.forgotPassword) {
      throw new ServiceError('forbidden', 'password recovery is disabled');
    }
    const rawEmail = body?.email;
    if (typeof rawEmail !== 'string') {
      throw new ServiceError('bad_request', 'email is required');
    }
    const email = rawEmail.trim().toLowerCase();
    if (!isPlausibleEmail(email)) {
      throw new ServiceError('bad_request', 'invalid email');
    }

    const resolvedUsername = this.resolveUsernameForPasswordReset(email);
    if (!resolvedUsername && isDevelopment()) {
      console.log(`[habsum] forgot-password: no account for ${email} (generic success returned)`);
    }
    if (!resolvedUsername) {
      return GENERIC_FORGOT_PASSWORD_RESULT;
    }

    const retryAfterSeconds =
      this.userAndAuthRepository.passwordResetRetryAfterSeconds(resolvedUsername);
    if (retryAfterSeconds > 0) {
      return {
        ok: true as const,
        message: 'please wait a little while longer',
        timeout: retryAfterSeconds,
      };
    }

    const { token, id: tokenId } = this.userAndAuthRepository.issuePasswordResetToken(
      resolvedUsername,
      'reset',
    );
    try {
      await this.sendPasswordResetEmail(resolvedUsername, email, token);
      this.userAndAuthRepository.recordPasswordResetRequest(resolvedUsername);
    } catch (e) {
      this.userAndAuthRepository.consumePasswordResetToken(tokenId);
      console.error('[habsum] failed to send password reset email', e);
      throw new ServiceError('unavailable', 'Something went wrong with your request');
    }

    return GENERIC_FORGOT_PASSWORD_RESULT;
  }

  validateResetPassword(token: unknown) {
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    if (!normalizedToken) {
      throw new ServiceError('bad_request', 'token is required');
    }

    const row = this.userAndAuthRepository.lookupValidPasswordResetToken(normalizedToken);
    if (!row) {
      throw new ServiceError('bad_request', 'invalid or expired reset link');
    }

    return {
      ok: true,
      purpose: row.purpose,
      ...(row.purpose === 'invite'
        ? { displayName: this.userAndAuthRepository.getUserProfile(row.userId).displayName }
        : {}),
    };
  }

  @restrictForDemo()
  resetPassword(body: ResetPasswordInput | undefined) {
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token) {
      throw new ServiceError('bad_request', 'token is required');
    }

    const newPassword = getPassword(body?.newPassword);
    if (newPassword == null) {
      throw new ServiceError('bad_request', 'new password is required');
    }

    const row = this.userAndAuthRepository.lookupValidPasswordResetToken(token);
    if (!row) {
      throw new ServiceError('bad_request', 'invalid or expired reset link');
    }

    if (!this.userAndAuthRepository.isNewLoginPasswordAllowed(row.userId, newPassword)) {
      throw new ServiceError('bad_request', 'new password must be different from the current one');
    }

    if (!this.userAndAuthRepository.consumePasswordResetToken(row.id)) {
      throw new ServiceError('bad_request', 'invalid or expired reset link');
    }

    if (!this.userAndAuthRepository.resetLoginPassword(row.userId, newPassword)) {
      throw new ServiceError('bad_request', 'account no longer exists');
    }

    if (row.purpose === 'invite') {
      const sessionId = this.userAndAuthRepository.createUserSession(row.userId);
      return { data: { ok: true as const, user: row.userId }, sessionId };
    }

    return { data: { ok: true as const } };
  }

  loginWithOuc(body: OucLoginInput | undefined) {
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token || !this.userAndAuthRepository.isOucSessionId(token)) {
      throw new ServiceError('bad_request', 'invalid token');
    }

    const user = this.userAndAuthRepository.getUsernameForSession(token);
    if (!user) {
      throw new ServiceError('unauthorized', 'invalid or expired token');
    }

    return { ok: true as const, user };
  }

  logoutOuc(token: string | null): void {
    if (token && this.userAndAuthRepository.isOucSessionId(token)) {
      this.userAndAuthRepository.revokeUserSession(token);
    }
  }

  logout(sessionId: string | null): void {
    if (sessionId) this.userAndAuthRepository.revokeUserSession(sessionId);
  }

  createInviteRegistrationUrl(user: string): string {
    const { token } = this.userAndAuthRepository.issuePasswordResetToken(user, 'invite');
    return getPasswordResetUrl(token, process.env.HABSUM_WEBAPP_URL);
  }

  async sendInviteEmail(user: string, registrationUrl: unknown) {
    if (typeof registrationUrl !== 'string') {
      throw new ServiceError('bad_request', 'registrationUrl is required');
    }

    let token: string | null;
    try {
      token = new URL(registrationUrl).searchParams.get('token');
    } catch {
      throw new ServiceError('bad_request', 'invalid registration URL');
    }
    if (!token) throw new ServiceError('bad_request', 'invalid registration URL');

    const invite = this.userAndAuthRepository.lookupValidPasswordResetToken(token);
    if (!invite || invite.purpose !== 'invite' || invite.userId !== user) {
      throw new ServiceError('bad_request', 'invalid or expired registration URL');
    }

    const profile = this.userAndAuthRepository.getUserProfile(user);
    const email = profile.email?.trim() ?? '';
    if (!isPlausibleEmail(email)) {
      throw new ServiceError('bad_request', 'user does not have a valid email address');
    }

    try {
      await this.sendInviteSetupEmail(email, profile.displayName?.trim() || user, token);
    } catch (error) {
      throw new ServiceError(
        'unavailable',
        error instanceof Error ? error.message : 'failed to send invite email',
      );
    }

    return { ok: true as const, recipient: email };
  }

  private resolveUsernameForPasswordReset(email: string): string | null {
    return this.userAndAuthRepository.resolveUsernameByLoginId(email);
  }

  private async sendPasswordResetEmail(
    username: string,
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = getPasswordResetUrl(resetToken, process.env.HABSUM_WEBAPP_URL);
    const displayName = this.userAndAuthRepository.getUserProfile(username).displayName?.trim();
    const greetingName = displayName || username;
    const content = passwordResetEmailContent(resetUrl, greetingName);

    if (isDevelopment()) {
      this.logEmailPreview('password reset email', email, resetUrl, content, resetToken);
    }

    await this.emailService.sendEmail({
      deliveryName: 'password reset email',
      to: email,
      ...content,
    });

    if (isDevelopment()) {
      console.log(`[habsum] password reset email sent via Resend to ${email}`);
    }
  }

  private async sendInviteSetupEmail(
    email: string,
    displayName: string,
    setupToken: string,
  ): Promise<void> {
    const setupUrl = getPasswordResetUrl(setupToken, process.env.HABSUM_WEBAPP_URL);
    const content = inviteEmailContent(displayName, setupUrl);

    if (isDevelopment()) {
      this.logEmailPreview('invite email', email, setupUrl, content);
    }

    await this.emailService.sendEmail({
      deliveryName: 'invite email',
      to: email,
      ...content,
    });

    if (isDevelopment()) {
      console.log(`[habsum] invite email sent via Resend to ${email}`);
    }
  }

  private logEmailPreview(
    label: string,
    email: string,
    url: string,
    content: { subject: string; text: string },
    token?: string,
  ): void {
    console.log(`[habsum] --- ${label} (dev preview) ---`);
    console.log(`[habsum] from:    ${this.emailService.getConfiguredFromAddress() ?? '(not set)'}`);
    console.log(`[habsum] to:      ${email}`);
    console.log(`[habsum] subject: ${content.subject}`);
    if (token) console.log(`[habsum] token:   ${token}`);
    console.log(`[habsum] url:     ${url}`);
    console.log('[habsum] body:');
    for (const line of content.text.split('\n')) {
      console.log(`[habsum]   ${line}`);
    }
    console.log(`[habsum] --- end ${label} preview ---`);
  }
}
