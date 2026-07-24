import request from 'supertest';
import { dayFromString } from '@habsum/types/common/day';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { yamlString } from '@habsum/types/common/misc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { AuthService } from '../../services/auth-service.js';
import { ConfigService } from '../../services/config-service.js';
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

  it('stores display name and sends invite email when requested', async () => {
    const app = createApp();
    const sendInviteEmail = vi.spyOn(AuthService.prototype, 'sendInviteEmail').mockResolvedValue();

    const res = await request(app).post('/users').set('Cookie', adminSessionCookie()).send({
      email: 'invited@example.com',
      displayName: 'Alex',
      sendInviteEmail: true,
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ok: true,
      user: expect.any(String),
      inviteEmailSent: true,
    });
    expect(sendInviteEmail).toHaveBeenCalledWith(res.body.user, 'invited@example.com', 'Alex');
  });

  it('requires display name to send invite email', async () => {
    const app = createApp();

    const res = await request(app).post('/users').set('Cookie', adminSessionCookie()).send({
      email: 'missing-name@example.com',
      sendInviteEmail: true,
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'displayName is required to send invite email' });
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
