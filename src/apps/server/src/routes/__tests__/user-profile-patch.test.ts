import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

describe('PATCH /users/:user profile', () => {
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
