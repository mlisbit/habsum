import { once } from 'node:events';
import { createServer } from 'node:http';
import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();
const app = createServer(createApp());
const forbidden = { error: 'This action is unavailable in demo mode.' };
const date = '2026-10-17';
const configText = yamlString(`habits:
  journal:
    type: text
  weekly notes:
    type: text
    reset: [monday]
  water:
    type: summation
    goal: 8
  mood:
    type: single_select
    options: [good, bad]
`);
let userNumber = 0;

async function getDemoSession() {
  vi.stubEnv('HABSUM_ENABLE_DEMO', 'false');
  const user = `demo-mode-${++userNumber}`;
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(user, configText);
  if (!written.ok) throw new Error(written.error);
  userAndAuthRepository.setUserPassword(user, 'original-password');
  userAndAuthRepository.patchUserProfile(user, {
    displayName: 'Demo User',
    email: `${user}@example.com`,
    theme: 'dark',
  });
  const session = userAndAuthRepository.createUserSession(user, 3600);
  const cookie = `${SESSION_COOKIE_NAME}=${session}`;
  for (const habit of ['journal', 'weekly notes']) {
    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({ habit, date, text: 'Original note' })
      .expect(200);
  }
  vi.stubEnv('HABSUM_ENABLE_DEMO', 'true');
  return { app, user, cookie };
}

// Keep requests on one listener instead of allocating a new port for every request.
beforeAll(async () => {
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
});

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      app.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    }),
);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('demo mode', () => {
  it.each([
    [undefined, false],
    ['false', false],
    ['TRUE', false],
    ['1', false],
    ['true', true],
  ])('exposes demoEnabled for HABSUM_ENABLE_DEMO=%s', async (flag, demoEnabled) => {
    vi.stubEnv('HABSUM_ENABLE_DEMO', flag);
    const response = await request(app)
      .get('/application')
      .query({ demoEnabled: !demoEnabled })
      .expect(200);
    expect(response.body.demoEnabled).toBe(demoEnabled);
  });

  it.each([
    { username: 'renameddemo' },
    { displayName: 'Someone else' },
    { displayName: null },
    { email: 'other@example.com' },
    { email: null },
    { username: '' },
    { displayName: 'Someone else', theme: 'light', demoEnabled: false },
  ])('rejects profile edits before making any changes: %j', async (body) => {
    const { app, user, cookie } = await getDemoSession();
    const profile = userAndAuthRepository.getUserProfile(user);
    await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', cookie)
      .send(body)
      .expect(403, forbidden);
    expect(userAndAuthRepository.getUserProfile(user)).toEqual(profile);
    expect(configService.readUserConfigText(user)).toBe(configText);
    expect(configService.loadUserConfig('renameddemo')).toBeNull();
  });

  it('allows theme changes, reads, and non-text habit tracking', async () => {
    const { app, user, cookie } = await getDemoSession();
    await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', cookie)
      .send({ theme: 'light' })
      .expect(200);
    expect(userAndAuthRepository.getUserProfile(user).theme).toBe('light');

    for (const body of [
      { habit: 'water', total: 3 },
      { habit: 'mood', value: 'good' },
    ]) {
      await request(app)
        .patch(`/users/${user}/habits`)
        .set('Cookie', cookie)
        .send({ ...body, date, clientCreatedAt: `${date} 12:00:00` })
        .expect(200);
    }
    await request(app).get(`/users/${user}/config`).set('Cookie', cookie).expect(200);
    const response = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date })
      .set('Cookie', cookie)
      .expect(200);
    expect(response.body.habits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'water', details: expect.objectContaining({ total: 3 }) }),
        expect.objectContaining({
          name: 'mood',
          details: expect.objectContaining({ value: 'good' }),
        }),
      ]),
    );
  });

  it.each(['text', 'config'])('rejects %s configuration saves and migrations', async (format) => {
    const { app, user, cookie } = await getDemoSession();
    const response = await request(app)
      .get(`/users/${user}/config`)
      .set('Cookie', cookie)
      .expect(200);
    await request(app)
      .put(`/users/${user}/config`)
      .set('Cookie', cookie)
      .send({
        [format]: response.body[format],
        migrations: [['journal', 'renamed journal']],
        deletions: ['mood.good'],
      })
      .expect(403, forbidden);
    expect(configService.readUserConfigText(user)).toBe(configText);
  });

  it.each([
    ['journal', { text: 'Changed note' }],
    ['journal', { text: '' }],
    ['journal', { action: 'clear' }],
    ['weekly notes', { text: 'Changed note' }],
    ['weekly notes', { text: '' }],
    ['weekly notes', { action: 'clear' }],
  ])('rejects note changes for %s: %j', async (habit, body) => {
    const { app, user, cookie } = await getDemoSession();
    await request(app)
      .patch(`/users/${user}/habits`)
      .set('Cookie', cookie)
      .send({ habit, date, ...body })
      .expect(403, forbidden);
    const response = await request(app)
      .get(`/users/${user}/habits`)
      .query({ date })
      .set('Cookie', cookie)
      .expect(200);
    expect(response.body.habits).toContainEqual(
      expect.objectContaining({
        name: habit,
        type: 'text',
        details: { text: 'Original note' },
      }),
    );
  });

  it('rejects password changes, recovery, and account deletion without changing credentials', async () => {
    const { app, user, cookie } = await getDemoSession();
    const { token } = userAndAuthRepository.issuePasswordResetToken(user, 'reset');
    await request(app)
      .post(`/users/${user}/password`)
      .set('Cookie', cookie)
      .send({ currentPassword: 'original-password', newPassword: 'changed-password' })
      .expect(403, forbidden);
    await request(app)
      .post('/auth/forgot-password')
      .send({ email: `${user}@example.com` })
      .expect(403, forbidden);
    await request(app)
      .post('/auth/reset-password')
      .send({ token, newPassword: 'changed-password' })
      .expect(403, forbidden);
    await request(app).delete(`/users/${user}`).set('Cookie', cookie).expect(403, forbidden);
    expect(userAndAuthRepository.isUserPasswordValid(user, 'original-password')).toBe(true);
    expect(userAndAuthRepository.lookupValidPasswordResetToken(token)).not.toBeNull();
    expect(configService.readUserConfigText(user)).toBe(configText);
  });

  it('rejects administrator password resets and account deletion', async () => {
    const { app, user } = await getDemoSession();
    const admin = `${user}admin`;
    userAndAuthRepository.createInitialAdminUser(admin, 'admin-password');
    const session = userAndAuthRepository.createUserSession(admin, 3600);
    const adminCookie = `${SESSION_COOKIE_NAME}=${session}`;
    await request(app)
      .patch('/users')
      .query({ name: user })
      .set('Cookie', adminCookie)
      .send({})
      .expect(403, forbidden);
    await request(app)
      .delete('/users')
      .query({ name: user })
      .set('Cookie', adminCookie)
      .expect(403, forbidden);
    expect(userAndAuthRepository.isUserPasswordValid(user, 'original-password')).toBe(true);
    expect(configService.readUserConfigText(user)).toBe(configText);
  });

  it.each([undefined, 'false'])('allows ordinary edits when demo mode is %s', async (flag) => {
    const { app, user, cookie } = await getDemoSession();
    vi.stubEnv('HABSUM_ENABLE_DEMO', flag);
    const renamedUser = `${user}renamed`;
    await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', cookie)
      .send({ username: renamedUser, displayName: 'New name', email: `${user}new@example.com` })
      .expect(200);
    expect(userAndAuthRepository.getUserProfile(renamedUser)).toMatchObject({
      displayName: 'New name',
      email: `${user}new@example.com`,
    });
    await request(app)
      .put(`/users/${renamedUser}/config`)
      .set('Cookie', cookie)
      .send({ text: configText.replace('goal: 8', 'goal: 10') })
      .expect(200);
    expect(configService.loadUserConfig(renamedUser)?.habits).toContainEqual(
      expect.objectContaining({ name: 'water', settings: expect.objectContaining({ goal: 10 }) }),
    );
    await request(app)
      .patch(`/users/${renamedUser}/habits`)
      .set('Cookie', cookie)
      .send({ habit: 'journal', date, text: 'Updated note' })
      .expect(200);
    await request(app)
      .post(`/users/${renamedUser}/password`)
      .set('Cookie', cookie)
      .send({ currentPassword: 'original-password', newPassword: 'changed-password' })
      .expect(200);
    expect(userAndAuthRepository.isUserPasswordValid(renamedUser, 'changed-password')).toBe(true);
    await request(app).delete(`/users/${renamedUser}`).set('Cookie', cookie).expect(200);
    expect(configService.loadUserConfig(renamedUser)).toBeNull();
  });
});
