import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { createApp } from '../../app.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { ConfigService } from '../../services/config-service.js';
import { OUC_SESSION_HEADER, SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const app = createApp();
const repository = new UserAndAuthRepository();
const configService = new ConfigService();
let sequence = 0;
let user: string;
let admin: string;
let cookie: string;
let adminCookie: string;

beforeEach(() => {
  vi.stubEnv('HABSUM_ENABLE_DEMO', 'true');
  user = `demo-account-${++sequence}`;
  admin = `${user}-admin`;
  configService.createEmptyUserConfig(user);
  repository.setUserPassword(user, 'original-password');
  repository.createInitialAdminUser(admin, 'admin-password');
  cookie = `${SESSION_COOKIE_NAME}=${repository.createUserSession(user)}`;
  adminCookie = `${SESSION_COOKIE_NAME}=${repository.createUserSession(admin)}`;
});

afterEach(() => vi.unstubAllEnvs());

describe('PUT /users/:user/demo-account', () => {
  it('persists an idempotent toggle and returns DEMO_USER in current-user and user-list models', async () => {
    for (const demoUser of [true, true, false, false]) {
      const response = await request(app)
        .put(`/users/${user}/demo-account`)
        .set('Cookie', adminCookie)
        .send({ demoUser })
        .expect(200);
      expect(response.body).toMatchObject({ ok: true, user, demoUser });
      expect(repository.isDemoUser(user)).toBe(demoUser);

      const me = await request(app).get('/users/me').set('Cookie', cookie).expect(200);
      const users = await request(app).get('/users').set('Cookie', adminCookie).expect(200);
      const listed = users.body.users.find((row: { username: string }) => row.username === user);
      for (const entitlements of [
        response.body.entitlements,
        me.body.entitlements,
        listed.entitlements,
      ]) {
        expect(entitlements.includes(ProductEntitlement.DEMO_USER)).toBe(demoUser);
        expect(entitlements).toEqual(
          demoUser
            ? [ProductEntitlement.NEW_USER, ProductEntitlement.DEMO_USER]
            : [ProductEntitlement.NEW_USER],
        );
      }
    }
    expect(repository.isUserPasswordValid(user, 'original-password')).toBe(true);
    expect(repository.isUserAdmin(user)).toBe(false);
  });

  it('allows administrators to toggle their own account while retaining administrator access', async () => {
    await request(app)
      .put(`/users/${admin}/demo-account`)
      .set('Cookie', adminCookie)
      .send({ demoUser: true })
      .expect(200);

    const me = await request(app).get('/users/me').set('Cookie', adminCookie).expect(200);
    expect(me.body.admin).toBe(true);
    expect(me.body.entitlements).toEqual(
      expect.arrayContaining([ProductEntitlement.ADMIN, ProductEntitlement.DEMO_USER]),
    );
    await request(app)
      .put(`/users/${admin}/demo-account`)
      .set('Cookie', adminCookie)
      .send({ demoUser: false })
      .expect(200);
  });

  it('requires an administrator session and rejects operate-under sessions', async () => {
    await request(app).put(`/users/${user}/demo-account`).send({ demoUser: true }).expect(401);
    await request(app)
      .put(`/users/${user}/demo-account`)
      .set('Cookie', cookie)
      .send({ demoUser: true })
      .expect(403);
    await request(app)
      .put(`/users/${user}/demo-account`)
      .set('Cookie', adminCookie)
      .set(OUC_SESSION_HEADER, repository.createOucUserSession(user))
      .send({ demoUser: true })
      .expect(403);
    expect(repository.isDemoUser(user)).toBe(false);
  });

  it.each([undefined, 'false'])('prevents changes when demo mode is %s', async (flag) => {
    repository.setUserDemo(user, true);
    vi.stubEnv('HABSUM_ENABLE_DEMO', flag);
    await request(app)
      .put(`/users/${user}/demo-account`)
      .set('Cookie', adminCookie)
      .send({ demoUser: false })
      .expect(403, { error: 'Demo mode is disabled.' });
    expect(repository.isDemoUser(user)).toBe(true);
    const me = await request(app).get('/users/me').set('Cookie', cookie).expect(200);
    expect(me.body.entitlements).toContain(ProductEntitlement.DEMO_USER);
  });

  it.each([{}, { demoUser: 'true' }, { demoUser: 1 }, { demoUser: null }])(
    'rejects invalid demo flags: %j',
    async (body) => {
      await request(app)
        .put(`/users/${user}/demo-account`)
        .set('Cookie', adminCookie)
        .send(body)
        .expect(400, { error: 'demoUser must be a boolean' });
      expect(repository.isDemoUser(user)).toBe(false);
    },
  );

  it('returns not found without creating an account', async () => {
    await request(app)
      .put('/users/missing-demo-account/demo-account')
      .set('Cookie', adminCookie)
      .send({ demoUser: true })
      .expect(404, { error: 'user not found' });
    expect(repository.resolveUsernameByLoginId('missing-demo-account')).toBeNull();
  });
});
