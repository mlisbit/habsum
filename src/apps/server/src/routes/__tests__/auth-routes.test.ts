import getPackageVersion from '../../utils/get-package-version.js';
import { EmailSettingsRepository } from '../../repositories/email-settings-repository.js';
import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { ConfigRepository } from '../../repositories/config-repository.js';
import { EmailService } from '../../services/email-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { ApplicationSettingsRepository } from '../../repositories/application-settings-repository.js';
import { OUC_SESSION_HEADER, SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();
const applicationSettingsRepository = new ApplicationSettingsRepository();

describe('POST /auth/signup', () => {
  afterEach(() => {
    applicationSettingsRepository.setAccountSignupEnabled(false);
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('rejects direct API account creation while the feature is disabled', async () => {
    applicationSettingsRepository.setAccountSignupEnabled(false);

    const response = await request(createApp())
      .post('/auth/signup')
      .send({ email: 'disabled-signup@example.com', password: 'secret' })
      .expect(403);

    expect(response.body).toEqual({ error: 'account creation is disabled' });
    expect(
      userAndAuthRepository.resolveUsernameByLoginId('disabled-signup@example.com'),
    ).toBeNull();
    expect(configService.loadUserConfig('disabled-signup')).toBeNull();
  });

  it('creates and authenticates an account while the feature is enabled', async () => {
    applicationSettingsRepository.setAccountSignupEnabled(true);

    const response = await request(createApp())
      .post('/auth/signup')
      .send({ email: 'self-signup@example.com', password: 'chosen-secret' })
      .expect(201);

    expect(response.body).toEqual({ ok: true, user: 'selfsignup' });
    const sessionCookie = response.headers['set-cookie']?.[0]?.split(';')[0];
    expect(sessionCookie).toMatch(/^habsum_sid=/);
    expect(configService.loadUserConfig('selfsignup')?.habits).toEqual([]);
    expect(userAndAuthRepository.isUserPasswordValid('selfsignup', 'chosen-secret')).toBe(true);
    expect(userAndAuthRepository.getUserProfile('selfsignup').email).toBe(
      'self-signup@example.com',
    );

    const meResponse = await request(createApp())
      .get('/users/me')
      .set('Cookie', sessionCookie!)
      .expect(200);
    expect(meResponse.body).toMatchObject({
      username: 'selfsignup',
      email: 'self-signup@example.com',
    });
  });

  it('validates signup input and rejects an email already in use', async () => {
    applicationSettingsRepository.setAccountSignupEnabled(true);
    userAndAuthRepository.setUserPassword('existing-signup-user', 'secret');
    userAndAuthRepository.patchUserProfile('existing-signup-user', {
      email: 'existing-signup@example.com',
    });
    const app = createApp();

    await request(app)
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'secret' })
      .expect(400, { error: 'invalid email' });
    await request(app)
      .post('/auth/signup')
      .send({ email: 'missing-password@example.com' })
      .expect(400, { error: 'password is required' });
    await request(app)
      .post('/auth/signup')
      .send({ email: 'existing-signup@example.com', password: 'secret' })
      .expect(409, { error: 'email already in use' });
  });
});

describe('session routes', () => {
  it('reports application feature availability', async () => {
    const emailSettings = new EmailSettingsRepository();
    try {
      applicationSettingsRepository.setAccountSignupEnabled(true);
      emailSettings.setResendSettings({
        apiKey: 're_test',
        fromEmail: 'sender@example.com',
        updatedAt: 1,
      });
      await request(createApp())
        .get('/application')
        .expect(200)
        .expect((response: { body: unknown }) =>
          expect(response.body).toEqual({
            apiVersion: getPackageVersion(),
            demoEnabled: false,
            demoUser: null,
            serverTime: expect.any(Object),
            database: { path: expect.any(String) },
            redirectPath: null,
            features: { accountSignup: true, forgotPassword: true },
          }),
        );
      emailSettings.deleteResendSettings();
      applicationSettingsRepository.setAccountSignupEnabled(false);
      await request(createApp())
        .get('/application')
        .expect(200)
        .expect((response: { body: unknown }) =>
          expect(response.body).toEqual({
            apiVersion: getPackageVersion(),
            demoEnabled: false,
            demoUser: null,
            serverTime: expect.any(Object),
            database: { path: expect.any(String) },
            redirectPath: null,
            features: { accountSignup: false, forgotPassword: false },
          }),
        );
    } finally {
      emailSettings.deleteResendSettings();
      applicationSettingsRepository.setAccountSignupEnabled(false);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([
    [false, 'true', '/welcome'],
    [true, 'true', null],
    [false, 'false', null],
    [true, 'false', null],
    [false, undefined, null],
  ])('reports redirect for hasUsers=%s and flag=%s', async (hasUsers, flag, redirectPath) => {
    vi.stubEnv('HABSUM_INITIAL_WEB_SIGNUP', flag);
    vi.spyOn(UserAndAuthRepository.prototype, 'hasUsers').mockReturnValue(hasUsers);
    const response = await request(createApp()).get('/application').expect(200);
    expect(response.body).toMatchObject({
      redirectPath,
      features: { accountSignup: false, forgotPassword: false },
    });
  });

  it('logs in through /auth/login, resolves /users/me, and logs out through /auth/logout', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    configService.ensureConfigLayout();
    configService.createEmptyUserConfig('session-route-user');
    userAndAuthRepository.setUserPassword('session-route-user', 'correct-password');
    const app = createApp();

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ user: 'session-route-user', password: 'correct-password' })
      .expect(200);
    const sessionCookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];

    expect(loginRes.headers['set-cookie']?.[0]).toContain('Path=/; HttpOnly; SameSite=Lax');
    expect(loginRes.headers['set-cookie']?.[0]).not.toMatch(/;\s*Secure(?:;|$)/i);

    expect(sessionCookie).toMatch(/^habsum_sid=/);
    const meRes = await request(app).get('/users/me').set('Cookie', sessionCookie!).expect(200);
    expect(meRes.body).toMatchObject({
      username: 'session-route-user',
      admin: false,
      isOucSession: false,
    });
    expect(meRes.body).not.toHaveProperty('sessionTokenPrefix');

    await request(app).post('/auth/logout').set('Cookie', sessionCookie!).send({}).expect(200);

    const loggedOutMeRes = await request(app)
      .get('/users/me')
      .set('Cookie', sessionCookie!)
      .expect(200);
    expect(loggedOutMeRes.body.username).toBeNull();
  });

  it.each(['header', 'cookie'])('reports an OUC session supplied through a %s', async (source) => {
    const user = `ouc-me-${source}`;
    userAndAuthRepository.setUserPassword(user, 'secret');
    const token = userAndAuthRepository.createOucUserSession(user);
    const headers: Record<string, string> =
      source === 'header'
        ? { [OUC_SESSION_HEADER]: token }
        : { Cookie: `${SESSION_COOKIE_NAME}=${token}` };

    const response = await request(createApp()).get('/users/me').set(headers).expect(200);

    expect(response.body).toMatchObject({ username: user, isOucSession: true });
    expect(response.body).not.toHaveProperty('sessionTokenPrefix');
  });

  it.each([
    [{ user: 'missing-login-user', password: 'wrong-password' }, 401],
    [{ user: 'missing-login-user' }, 400],
  ])('rejects invalid login attempts with status %s', async (body, statusCode) => {
    await request(createApp()).post('/auth/login').send(body).expect(statusCode);
  });

  it('does not rewrite legacy config when resolving an existing session', async () => {
    const user = 'legacy-session-route-user';
    configService.createEmptyUserConfig(user);
    const legacy = yamlString(`habits:
  push ups:
    type: summation
    goal: 100
    history:
      displays: [weekly_history]
      period: 3w
    streak:
      options: ['100']
      show_longest: true
`);
    new ConfigRepository().writeUserConfigText(user, legacy);
    userAndAuthRepository.setUserPassword(user, 'correct-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    await request(createApp()).get('/users/me').set('Cookie', `habsum_sid=${session}`).expect(200);

    expect(configService.readUserConfigText(user)).toBe(legacy);
  });
});

describe('POST /auth/forgot-password', () => {
  beforeEach(() => {
    new EmailSettingsRepository().setResendSettings({
      apiKey: 're_test',
      fromEmail: 'sender@example.com',
      updatedAt: 1,
    });
  });
  afterEach(() => new EmailSettingsRepository().deleteResendSettings());
  it('rejects recovery requests when email is not configured', async () => {
    new EmailSettingsRepository().deleteResendSettings();
    await request(createApp())
      .post('/auth/forgot-password')
      .send({ email: 'known@example.com' })
      .expect(403, { error: 'password recovery is disabled' });
  });

  it('returns the same success message whether or not the email is registered', async () => {
    const app = createApp();
    const sendSpy = vi.spyOn(EmailService.prototype, 'sendEmail').mockResolvedValue(undefined);

    userAndAuthRepository.setUserPassword('forgot-password-user', 'test-password');
    userAndAuthRepository.patchUserProfile('forgot-password-user', { email: 'known@example.com' });

    const unknownRes = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'unknown@example.com' })
      .expect(200);

    expect(unknownRes.body).toEqual({
      ok: true,
      message: 'If an account exists for that email, reset instructions will be sent shortly.',
    });
    expect(sendSpy).not.toHaveBeenCalled();

    const knownRes = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'known@example.com' })
      .expect(200);

    expect(knownRes.body).toEqual({
      ok: true,
      message: 'If an account exists for that email, reset instructions will be sent shortly.',
    });
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryName: 'password reset email',
        to: 'known@example.com',
      }),
    );

    sendSpy.mockRestore();
  });

  it('rejects missing or invalid emails', async () => {
    const app = createApp();

    await request(app).post('/auth/forgot-password').send({}).expect(400);
    await request(app).post('/auth/forgot-password').send({ email: 'not-an-email' }).expect(400);
  });

  it('rate limits repeat reset requests for the same user', async () => {
    const app = createApp();
    const sendSpy = vi.spyOn(EmailService.prototype, 'sendEmail').mockResolvedValue(undefined);
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    userAndAuthRepository.setUserPassword('rate-limit-user', 'test-password');
    userAndAuthRepository.patchUserProfile('rate-limit-user', { email: 'ratelimit@example.com' });

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'ratelimit@example.com' })
      .expect(200);
    expect(sendSpy).toHaveBeenCalledOnce();

    vi.spyOn(Date, 'now').mockReturnValue(now + 10_000);

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'ratelimit@example.com' })
      .expect(200);

    expect(res.body).toEqual({
      ok: true,
      message: 'please wait a little while longer',
      timeout: 20,
    });
    expect(sendSpy).toHaveBeenCalledOnce();

    sendSpy.mockRestore();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns an error to the client when email delivery fails for a known user', async () => {
    const app = createApp();
    vi.spyOn(EmailService.prototype, 'sendEmail').mockRejectedValue(
      new Error('Resend API key is not configured'),
    );

    userAndAuthRepository.setUserPassword('email-fail-user', 'test-password');
    userAndAuthRepository.patchUserProfile('email-fail-user', { email: 'fail@example.com' });

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'fail@example.com' })
      .expect(503);

    expect(res.body).toEqual({ error: 'Something went wrong with your request' });

    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
});

describe('password reset token flow', () => {
  it('validates and consumes a reset token to change the password', async () => {
    const app = createApp();
    userAndAuthRepository.setUserPassword('reset-token-user', 'test-password');
    userAndAuthRepository.setUserPassword('reset-token-user', 'old-secret');

    const { token } = userAndAuthRepository.issuePasswordResetToken('reset-token-user', 'reset');

    const validateRes = await request(app).get('/auth/reset-password').query({ token }).expect(200);
    expect(validateRes.body).toEqual({
      ok: true,
      purpose: 'reset',
    });

    await request(app)
      .post('/auth/reset-password')
      .send({ token, newPassword: 'new-secret' })
      .expect(200);

    expect(userAndAuthRepository.isUserPasswordValid('reset-token-user', 'new-secret')).toBe(true);
    expect(userAndAuthRepository.isUserPasswordValid('reset-token-user', 'old-secret')).toBe(false);

    await request(app).get('/auth/reset-password').query({ token }).expect(400);
  });

  it('rejects expired reset tokens', async () => {
    const app = createApp();
    userAndAuthRepository.setUserPassword('expired-token-user', 'test-password');
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    const { token } = userAndAuthRepository.issuePasswordResetToken(
      'expired-token-user',
      'reset',
      now,
    );

    vi.spyOn(Date, 'now').mockReturnValue((now + 16 * 60) * 1000);

    await request(app).get('/auth/reset-password').query({ token }).expect(400);

    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns display name for invite tokens and auto-logs in after password set', async () => {
    configService.ensureConfigLayout();
    const app = createApp();
    configService.createEmptyUserConfig('invite-setup-user');
    userAndAuthRepository.setUserPassword('invite-setup-user', 'temp-secret');
    userAndAuthRepository.patchUserProfile('invite-setup-user', {
      displayName: 'Alex',
      email: 'alex@example.com',
    });

    const { token } = userAndAuthRepository.issuePasswordResetToken('invite-setup-user', 'invite');

    const validateRes = await request(app).get('/auth/reset-password').query({ token }).expect(200);
    expect(validateRes.body).toEqual({
      ok: true,
      purpose: 'invite',
      displayName: 'Alex',
    });

    const resetRes = await request(app)
      .post('/auth/reset-password')
      .send({ token, newPassword: 'chosen-secret' })
      .expect(200);

    expect(resetRes.body).toEqual({ ok: true, user: 'invite-setup-user' });
    const sessionCookie = resetRes.headers['set-cookie']?.[0]?.split(';')[0];
    expect(sessionCookie).toMatch(/^habsum_sid=/);
    expect(userAndAuthRepository.isUserPasswordValid('invite-setup-user', 'chosen-secret')).toBe(
      true,
    );

    const meRes = await request(app).get('/users/me').set('Cookie', sessionCookie!).expect(200);

    expect(meRes.body).toMatchObject({ username: 'invite-setup-user', displayName: 'Alex' });
  });
});
