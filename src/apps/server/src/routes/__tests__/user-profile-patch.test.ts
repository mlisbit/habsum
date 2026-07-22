import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

describe('PATCH /users/:user profile', () => {
  it('stores and returns a canonical hometown option', async () => {
    configService.ensureConfigLayout();
    const user = 'hometown-patch-user';
    const created = configService.createEmptyUserConfig(user);
    expect(created.ok).toBe(true);
    userAndAuthRepository.setUserPassword(user, 'test-password');

    const app = createApp();
    const sid = userAndAuthRepository.createUserSession(user, 3600);
    const cookie = `${SESSION_COOKIE_NAME}=${sid}`;

    const patchRes = await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', cookie)
      .send({ hometown: { id: 'ca-on-toronto', name: 'Untrusted display name' } });

    expect(patchRes.status).toBe(200);
    expect(userAndAuthRepository.getUserProfile(user).hometownId).toBe('ca-on-toronto');

    const meRes = await request(app).get('/users/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.hometown).toEqual({
      id: 'ca-on-toronto',
      name: 'Toronto, ON, Canada',
    });
  });

  it('rejects a hometown outside the built-in list', async () => {
    configService.ensureConfigLayout();
    const user = 'invalid-hometown-patch-user';
    const created = configService.createEmptyUserConfig(user);
    expect(created.ok).toBe(true);
    userAndAuthRepository.setUserPassword(user, 'test-password');

    const sid = userAndAuthRepository.createUserSession(user, 3600);
    const res = await request(createApp())
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ hometown: { id: 'fr-paris', name: 'Paris, France' } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid hometown' });
  });

  it('stores null theme for system default (null body)', async () => {
    configService.ensureConfigLayout();
    const user = 'theme-patch-user';
    const created = configService.createEmptyUserConfig(user);
    expect(created.ok).toBe(true);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    userAndAuthRepository.patchUserProfile(user, { theme: 'dark' });

    const app = createApp();
    const sid = userAndAuthRepository.createUserSession(user, 3600);

    const res = await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ theme: null });

    expect(res.status).toBe(200);
    expect(userAndAuthRepository.getUserProfile(user).theme).toBe(null);
  });

  it('stores null theme when body sends "system"', async () => {
    configService.ensureConfigLayout();
    const user = 'theme-patch-system-user';
    const created = configService.createEmptyUserConfig(user);
    expect(created.ok).toBe(true);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    userAndAuthRepository.patchUserProfile(user, { theme: 'dark' });

    const app = createApp();
    const sid = userAndAuthRepository.createUserSession(user, 3600);

    const res = await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ theme: 'system' });

    expect(res.status).toBe(200);
    expect(userAndAuthRepository.getUserProfile(user).theme).toBe(null);
  });
});
