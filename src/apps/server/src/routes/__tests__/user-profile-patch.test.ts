import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

describe('PATCH /users/:user profile', () => {
  it.each(['', '   '])('clears an existing email when saving %j', async (email) => {
    const user = email === '' ? 'clear-email-user' : 'clear-email-spaces-user';
    expect(configService.createEmptyUserConfig(user).ok).toBe(true);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    userAndAuthRepository.patchUserProfile(user, { email: `${user}@example.com` });
    const sid = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();

    await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ email })
      .expect(200);

    expect(userAndAuthRepository.getUserProfile(user).email).toBeNull();
    const me = await request(app)
      .get('/users/me')
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .expect(200);
    expect(me.body.email).toBe('');
  });

  it('saves other profile fields without requiring an email', async () => {
    const user = 'profile-no-email-user';
    expect(configService.createEmptyUserConfig(user).ok).toBe(true);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const sid = userAndAuthRepository.createUserSession(user, 3600);

    await request(createApp())
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ displayName: 'Alex' })
      .expect(200);

    expect(userAndAuthRepository.getUserProfile(user)).toMatchObject({
      displayName: 'Alex',
      email: null,
    });
  });

  it('still rejects malformed or duplicate non-empty emails', async () => {
    const user = 'validate-email-user';
    const otherUser = 'existing-email-user';
    for (const username of [user, otherUser]) {
      expect(configService.createEmptyUserConfig(username).ok).toBe(true);
      userAndAuthRepository.setUserPassword(username, 'test-password');
    }
    userAndAuthRepository.patchUserProfile(otherUser, { email: 'existing@example.com' });
    const sid = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();

    await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ email: 'invalid' })
      .expect(400, { error: 'invalid email' });
    await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ email: ' Existing@Example.COM ' })
      .expect(409, { error: 'email already in use' });

    expect(userAndAuthRepository.getUserProfile(user).email).toBeNull();
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
