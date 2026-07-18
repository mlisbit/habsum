import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { YamlUserConfigService } from '../services/yaml-user-config-service.js';
import { createUserSession, getUserProfile, patchUserProfile } from '../db.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

const yamlUserConfigService = new YamlUserConfigService();

describe('PATCH /users/:user profile', () => {
  it('stores null theme for system default (null body)', async () => {
    yamlUserConfigService.ensureConfigLayout();
    const user = 'theme-patch-user';
    const created = yamlUserConfigService.createEmptyUserConfig(user);
    expect(created.ok).toBe(true);
    patchUserProfile(user, { theme: 'dark' });

    const app = createApp();
    const sid = createUserSession(user, 3600);

    const res = await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ theme: null });

    expect(res.status).toBe(200);
    expect(getUserProfile(user).theme).toBe(null);
  });

  it('stores null theme when body sends "system"', async () => {
    yamlUserConfigService.ensureConfigLayout();
    const user = 'theme-patch-system-user';
    const created = yamlUserConfigService.createEmptyUserConfig(user);
    expect(created.ok).toBe(true);
    patchUserProfile(user, { theme: 'dark' });

    const app = createApp();
    const sid = createUserSession(user, 3600);

    const res = await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${sid}`)
      .send({ theme: 'system' });

    expect(res.status).toBe(200);
    expect(getUserProfile(user).theme).toBe(null);
  });
});
