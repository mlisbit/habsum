import request from 'supertest';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { ConfigService } from '../services/config-service.js';
import {
  addToTotal,
  countAdmins,
  createInitialAdminUser,
  createUserSession,
  ensureUserPins,
  patchUserProfile,
  setSelect,
} from '../db.js';
import * as inviteEmail from '../invite-email.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';
import { PACKAGE_VERSION } from '../version.js';

const configService = new ConfigService();

function adminSessionCookie(): string {
  configService.ensureConfigLayout();
  ensureUserPins(['admin']);
  if (countAdmins() === 0) {
    createInitialAdminUser('admin', 'secret');
  }
  const adminSession = createUserSession('admin', 3600);
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

    ensureUserPins(['regular']);
    const regularSession = createUserSession('regular', 3600);

    await request(app)
      .post('/users')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${regularSession}`)
      .send({ email: 'regular@example.com' })
      .expect(403);

    createInitialAdminUser('admin', 'secret');
    const adminSession = createUserSession('admin', 3600);

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
    const sendInviteEmail = vi.spyOn(inviteEmail, 'sendInviteEmail').mockResolvedValue();

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
    expect(sendInviteEmail).toHaveBeenCalledWith('invited@example.com', 'Alex', expect.any(String));
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

  it('includes null last login until /auth/me resolves, then returns unix seconds', async () => {
    configService.ensureConfigLayout();
    configService.createEmptyUserConfig('login-audit-user');
    configService.writeUserConfigText(
      'login-audit-user',
      `habits:
  push ups:
    type: summation
  soda consumption:
    type: single_select
    options: [none, light, moderate, heavy]
`,
    );
    ensureUserPins(['login-audit-user']);
    patchUserProfile('login-audit-user', {
      displayName: 'Login Audit',
      email: 'login-audit@example.com',
    });
    addToTotal('login-audit-user', 'push ups', '2026-05-28', 10, "datetime('now')");
    setSelect('login-audit-user', 'soda consumption', '2026-05-28', 'none');
    const app = createApp();

    const beforeLoginRes = await request(app).get('/users').set('Cookie', adminSessionCookie());
    expect(beforeLoginRes.status).toBe(200);
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

    const userSession = createUserSession('login-audit-user', 3600);
    vi.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);

    await request(app)
      .get('/auth/me')
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
