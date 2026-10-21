import getPackageVersion from '../../utils/get-package-version.js';
import request from 'supertest';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { ApplicationSettingsRepository } from '../../repositories/application-settings-repository.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';

describe('POST /auth/initial-user', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([undefined, 'false'])('rejects initial web signup when the flag is %s', async (flag) => {
    vi.stubEnv('HABSUM_INITIAL_WEB_SIGNUP', flag);
    vi.spyOn(UserAndAuthRepository.prototype, 'hasUsers').mockReturnValue(false);
    await request(createApp())
      .post('/auth/initial-user')
      .send({ username: 'blocked-owner', password: 'secret' })
      .expect(403, { error: 'initial web signup is disabled' });
    expect(new UserAndAuthRepository().resolveUsernameByLoginId('blocked-owner')).toBeNull();
  });
  it('creates and signs in the first administrator while public registration is disabled', async () => {
    vi.stubEnv('HABSUM_INITIAL_WEB_SIGNUP', 'true');
    const app = createApp();
    const configService = new ConfigService();
    const userAndAuthRepository = new UserAndAuthRepository();
    const applicationSettingsRepository = new ApplicationSettingsRepository();
    applicationSettingsRepository.setAccountSignupEnabled(false);

    await request(app).post('/auth/initial-user').send({}).expect(400, {
      error: 'username is required',
    });
    await request(app)
      .post('/auth/initial-user')
      .send({ username: 'admin', password: 'secret' })
      .expect(400, { error: 'invalid username' });
    await request(app)
      .post('/auth/initial-user')
      .send({ username: 'first-owner' })
      .expect(400, { error: 'password is required' });

    const response = await request(app)
      .post('/auth/initial-user')
      .send({ username: 'first-owner', password: 'chosen-secret', admin: false })
      .expect(201);

    expect(response.body).toEqual({ ok: true, user: 'first-owner' });
    expect(configService.loadUserConfig('first-owner')?.habits).toEqual([]);
    expect(userAndAuthRepository.isUserAdmin('first-owner')).toBe(true);
    expect(userAndAuthRepository.isUserPasswordValid('first-owner', 'chosen-secret')).toBe(true);

    const sessionCookie = response.headers['set-cookie']?.[0]?.split(';')[0];
    expect(sessionCookie).toMatch(/^habsum_sid=/);
    const meResponse = await request(app)
      .get('/users/me')
      .set('Cookie', sessionCookie!)
      .expect(200);
    expect(meResponse.body).toMatchObject({ username: 'first-owner', admin: true });
    expect(meResponse.body.entitlements).toContain(ProductEntitlement.DEVELOPER);
    await request(app)
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

    await request(app)
      .post('/auth/initial-user')
      .send({ username: 'second-owner', password: 'another-secret' })
      .expect(409, { error: 'the initial user already exists' });
    expect(configService.loadUserConfig('second-owner')).toBeNull();
  });
});
