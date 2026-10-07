import request from 'supertest';
import { dayFromString } from '@habsum/types/common/day';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { yamlString } from '@habsum/types/common/misc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { EmailService } from '../../services/email-service.js';
import { HabitRepository } from '../../repositories/habit-repository.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';
import getPackageVersion from '../../utils/get-package-version.js';

const configService = new ConfigService();
const habitRepository = new HabitRepository();
const userAndAuthRepository = new UserAndAuthRepository();
const PACKAGE_VERSION = getPackageVersion();

function adminSessionCookie(): string {
  configService.ensureConfigLayout();
  if (userAndAuthRepository.countAdmins() === 0) {
    userAndAuthRepository.createInitialAdminUser('admin', 'secret');
  }
  const adminSession = userAndAuthRepository.createUserSession('admin', 3600);
  return `${SESSION_COOKIE_NAME}=${adminSession}`;
}

describe('POST /users', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('only allows admins to create users', async () => {
    configService.ensureConfigLayout();
    const app = createApp();

    await request(app).post('/users').send({ email: 'nobody@example.com' }).expect(401);

    userAndAuthRepository.setUserPassword('regular', 'test-password');
    const regularSession = userAndAuthRepository.createUserSession('regular', 3600);

    await request(app)
      .post('/users')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${regularSession}`)
      .send({ email: 'regular@example.com' })
      .expect(403);

    userAndAuthRepository.createInitialAdminUser('admin', 'secret');
    const adminSession = userAndAuthRepository.createUserSession('admin', 3600);

    const res = await request(app)
      .post('/users')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${adminSession}`)
      .send({ email: 'new-user@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, user: expect.any(String) });
    expect(configService.loadUserConfig(res.body.user)?.habits).toEqual([]);
  });

  it('creates a user from an email and returns temporary registration details', async () => {
    const app = createApp();

    const res = await request(app).post('/users').set('Cookie', adminSessionCookie()).send({
      email: 'invited@example.com',
      displayName: 'Invited Person',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ok: true,
      user: expect.any(String),
      email: 'invited@example.com',
      password: expect.any(String),
      registrationUrl: expect.stringMatching(/^http:\/\/localhost:3000\/reset-password\?token=/),
    });
    expect(userAndAuthRepository.getUserProfile(res.body.user)).toMatchObject({
      displayName: 'Invited Person',
      email: 'invited@example.com',
    });
  });

  it('creates a user from an explicit username', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/users')
      .set('Cookie', adminSessionCookie())
      .send({ username: 'invitedbyname' })
      .expect(201);

    expect(res.body).toMatchObject({
      user: 'invitedbyname',
      password: expect.any(String),
      registrationUrl: expect.stringContaining('/reset-password?token='),
    });
    expect(res.body).not.toHaveProperty('email');
  });

  it('emails the returned registration URL to a newly created user', async () => {
    const app = createApp();
    const sendEmail = vi.spyOn(EmailService.prototype, 'sendEmail').mockResolvedValue();
    const cookie = adminSessionCookie();
    const created = await request(app)
      .post('/users')
      .set('Cookie', cookie)
      .send({ email: 'email-invite@example.com' })
      .expect(201);

    await request(app)
      .post(`/users/${created.body.user}/invite-email`)
      .set('Cookie', cookie)
      .send({ registrationUrl: created.body.registrationUrl })
      .expect(200, { ok: true, recipient: 'email-invite@example.com' });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryName: 'invite email',
        to: 'email-invite@example.com',
      }),
    );
  });

  it('requires at least one email or username and accepts both', async () => {
    const app = createApp();
    const cookie = adminSessionCookie();

    await request(app)
      .post('/users')
      .set('Cookie', cookie)
      .send({})
      .expect(400, {
        request: {},
        errors: { email: 'Enter an email or username.' },
      });
    await request(app)
      .post('/users')
      .set('Cookie', cookie)
      .send({ email: 'invalid' })
      .expect(400, {
        request: { email: 'invalid' },
        errors: { email: 'Enter a valid email address.' },
      });
    const both = await request(app)
      .post('/users')
      .set('Cookie', cookie)
      .send({ email: 'both@example.com', username: 'both' })
      .expect(201);
    expect(both.body).toMatchObject({ user: 'both', email: 'both@example.com' });
    expect(userAndAuthRepository.getUserProfile('both').email).toBe('both@example.com');
    await request(app)
      .post('/users')
      .set('Cookie', cookie)
      .send({ username: 'both' })
      .expect(409, {
        request: { username: 'both' },
        errors: { username: 'Username is already in use.' },
      });
    await request(app)
      .post('/users')
      .set('Cookie', cookie)
      .send({ username: 'validname', displayName: 123 })
      .expect(400, {
        request: { username: 'validname' },
        errors: { displayName: 'Display name must be a string.' },
      });
  });

  it('rejects usernames containing special characters with a field validation error', async () => {
    const app = createApp();

    await request(app)
      .post('/users')
      .set('Cookie', adminSessionCookie())
      .send({ username: 'invited-user' })
      .expect(400, {
        request: { username: 'invited-user' },
        errors: { username: 'Username can only contain letters and numbers.' },
      });
  });
});

describe('GET /users', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes null last login until /users/me resolves, then returns unix seconds', async () => {
    configService.ensureConfigLayout();
    configService.createEmptyUserConfig('config-without-account');
    configService.createEmptyUserConfig('login-audit-user');
    configService.writeUserConfigText(
      'login-audit-user',
      yamlString(`habits:
  push ups:
    type: summation
  soda consumption:
    type: single_select
    options: [none, light, moderate, heavy]
`),
    );
    userAndAuthRepository.setUserPassword('login-audit-user', 'test-password');
    userAndAuthRepository.patchUserProfile('login-audit-user', {
      displayName: 'Login Audit',
      email: 'login-audit@example.com',
    });
    habitRepository.applyHabitMutation({
      kind: 'add_total',
      user: 'login-audit-user',
      habit: 'push ups',
      date: dayFromString('2026-05-28'),
      total: 10,
      createdAt: "datetime('now')",
    });
    habitRepository.applyHabitMutation({
      kind: 'set_select',
      user: 'login-audit-user',
      habit: 'soda consumption',
      date: dayFromString('2026-05-28'),
      value: 'none',
    });
    const app = createApp();

    const beforeLoginRes = await request(app).get('/users').set('Cookie', adminSessionCookie());
    expect(beforeLoginRes.status).toBe(200);
    expect(
      beforeLoginRes.body.users.some(
        (user: { username: string }) => user.username === 'config-without-account',
      ),
    ).toBe(false);
    expect(beforeLoginRes.body.users).toContainEqual({
      username: 'login-audit-user',
      displayName: 'Login Audit',
      email: 'login-audit@example.com',
      lastLoginAt: null,
      webAndApiVersion: null,
      habitCount: 2,
      eventCount: 2,
      entitlements: [ProductEntitlement.BETA_TESTER],
    });

    const userSession = userAndAuthRepository.createUserSession('login-audit-user', 3600);
    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);

    await request(app)
      .get('/users/me')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${userSession}`)
      .set('x-habsum-web-version', PACKAGE_VERSION)
      .expect(200);

    const afterLoginRes = await request(app).get('/users').set('Cookie', adminSessionCookie());
    expect(afterLoginRes.status).toBe(200);
    expect(afterLoginRes.body.users).toContainEqual({
      username: 'login-audit-user',
      displayName: 'Login Audit',
      email: 'login-audit@example.com',
      lastLoginAt: 1_900_000_000,
      webAndApiVersion: PACKAGE_VERSION,
      habitCount: 2,
      eventCount: 2,
      entitlements: [ProductEntitlement.BETA_TESTER],
    });
  });
});

describe('GET /users/username-availability', () => {
  it('checks configured and available usernames for administrators', async () => {
    const app = createApp();

    await request(app).get('/users/username-availability?username=availablename').expect(401);

    const cookie = adminSessionCookie();
    configService.createEmptyUserConfig('existingavailabilityuser');
    await request(app)
      .get('/users/username-availability?username=existingavailabilityuser')
      .set('Cookie', cookie)
      .expect(200, { available: false });
    await request(app)
      .get('/users/username-availability?username=availablename')
      .set('Cookie', cookie)
      .expect(200, { available: true });
    await request(app)
      .get('/users/username-availability?username=invalid-name')
      .set('Cookie', cookie)
      .expect(400, {
        request: { username: 'invalid-name' },
        errors: { username: 'Username can only contain letters and numbers.' },
      });
  });
});
