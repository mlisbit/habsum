import { once } from 'node:events';
import { createServer } from 'node:http';
import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserService } from '../../services/user-service.js';
import { EmailService } from '../../services/email-service.js';
import { EmailSettingsRepository } from '../../repositories/email-settings-repository.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { ApplicationSettingsRepository } from '../../repositories/application-settings-repository.js';
import { OUC_SESSION_HEADER, SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();
const applicationSettingsRepository = new ApplicationSettingsRepository();
const app = createServer(createApp());
const forbidden = { error: 'Action prevented for demo users.' };
const date = '2026-10-17';
const configText = yamlString(`# version: 1
habits:
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

async function getDemoSession({ admin = false }: { admin?: boolean } = {}) {
  vi.stubEnv('HABSUM_ENABLE_DEMO', 'false');
  const user = `demo-mode-${++userNumber}`;
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(user, configText);
  if (!written.ok) throw new Error(written.error);
  if (admin) userAndAuthRepository.createInitialAdminUser(user, 'original-password');
  else userAndAuthRepository.setUserPassword(user, 'original-password');
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
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  new EmailSettingsRepository().deleteResendSettings();
  applicationSettingsRepository.setApplicationSettings({
    accountSignup: false,
    demoUser: { username: '', password: '' },
  });
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
    applicationSettingsRepository.setApplicationSettings({
      accountSignup: false,
      demoUser: { username: 'demo-user', password: 'demo-password' },
    });
    const response = await request(app)
      .get('/application')
      .query({ demoEnabled: !demoEnabled })
      .expect(200);
    expect(response.body.demoEnabled).toBe(demoEnabled);
    expect(response.body.demoUser).toEqual(
      demoEnabled ? { username: 'demo-user', password: 'demo-password' } : null,
    );
  });

  it.each([
    [undefined, undefined],
    [undefined, 'demo-password'],
    ['demo-user', undefined],
    ['', 'demo-password'],
    ['demo-user', ''],
    [' ', 'demo-password'],
    ['demo-user', ' '],
  ])('omits demo credentials when username=%s and password=%s', async (username, password) => {
    vi.stubEnv('HABSUM_ENABLE_DEMO', 'true');
    applicationSettingsRepository.setApplicationSettings({
      accountSignup: false,
      demoUser: { username: username ?? '', password: password ?? '' },
    });

    const response = await request(app).get('/application').expect(200);

    expect(response.body.demoEnabled).toBe(true);
    expect(response.body.demoUser).toBeNull();
  });

  it('ignores legacy environment credentials when no demo user is configured', async () => {
    vi.stubEnv('HABSUM_ENABLE_DEMO', 'true');
    vi.stubEnv('HABSUM_DEMO_USERNAME', 'legacy-demo');
    vi.stubEnv('HABSUM_DEMO_PASSWORD', 'legacy-password');
    const response = await request(app).get('/application').expect(200);
    expect(response.body.demoUser).toBeNull();
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
      { habit: 'water', total: 3, type: 'text' },
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
    ['journal', { type: 'summation', total: 5 }],
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

  it('allows administrator password resets and account deletion', async () => {
    const { app, user } = await getDemoSession();
    const admin = `${user}admin`;
    userAndAuthRepository.createInitialAdminUser(admin, 'admin-password');
    const session = userAndAuthRepository.createUserSession(admin, 3600);
    const adminCookie = `${SESSION_COOKIE_NAME}=${session}`;
    const response = await request(app)
      .patch('/users')
      .query({ name: user })
      .set('Cookie', adminCookie)
      .send({})
      .expect(200);
    expect(response.body).toEqual({ ok: true, user, password: expect.any(String) });
    expect(userAndAuthRepository.isUserPasswordValid(user, response.body.password)).toBe(true);
    expect(userAndAuthRepository.isUserPasswordValid(user, 'original-password')).toBe(false);
    await request(app)
      .delete('/users')
      .query({ name: user })
      .set('Cookie', adminCookie)
      .expect(200, { ok: true, user });
    expect(configService.loadUserConfig(user)).toBeNull();
    expect(userAndAuthRepository.resolveUsernameByLoginId(user)).toBeNull();
  });

  it('prevents demo users from revoking other sessions while allowing their own logout', async () => {
    const { user, cookie } = await getDemoSession();
    userAndAuthRepository.setUserDemo(user, true);
    const otherSession = userAndAuthRepository.createUserSession(user, 3600);
    const anotherSession = userAndAuthRepository.createUserSession(user, 3600);
    const sessions = userAndAuthRepository.listSessionsForUsername(user);

    await request(app)
      .delete(`/users/${user}/security/sessions`)
      .set('Cookie', cookie)
      .expect(403, forbidden);
    await request(app)
      .delete(`/users/${user}/security/sessions/${otherSession.slice(0, 8)}`)
      .set('Cookie', cookie)
      .expect(403, forbidden);
    expect(userAndAuthRepository.listSessionsForUsername(user)).toEqual(sessions);
    const security = await request(app)
      .get(`/users/${user}/security`)
      .set('Cookie', cookie)
      .expect(200);
    expect(security.body.sessions).toHaveLength(3);

    await request(app).post('/auth/logout').set('Cookie', cookie).expect(200, { ok: true });
    expect(
      userAndAuthRepository
        .listSessionsForUsername(user)
        .map((session) => session.id)
        .sort(),
    ).toEqual([otherSession, anotherSession].sort());
  });

  it.each(['normal', 'admin', 'ouc-header', 'ouc-cookie'])(
    'allows session revocation for %s access',
    async (access) => {
      const { user, cookie } = await getDemoSession({ admin: access === 'admin' });
      userAndAuthRepository.setUserDemo(user, true);
      let headers: Record<string, string> = { Cookie: cookie };
      if (access.startsWith('ouc')) {
        const oucSession = userAndAuthRepository.createOucUserSession(user);
        headers =
          access === 'ouc-header'
            ? { [OUC_SESSION_HEADER]: oucSession }
            : { Cookie: `${SESSION_COOKIE_NAME}=${oucSession}` };
      } else if (access === 'normal') {
        vi.stubEnv('HABSUM_ENABLE_DEMO', 'false');
      }
      const otherSession = userAndAuthRepository.createUserSession(user, 3600);
      await request(app)
        .delete(`/users/${user}/security/sessions/${otherSession.slice(0, 8)}`)
        .set(headers)
        .expect(200, { ok: true });
      expect(userAndAuthRepository.getUsernameForSession(otherSession)).toBeNull();
      userAndAuthRepository.createUserSession(user, 3600);
      const sessionCount = userAndAuthRepository.listSessionsForUsername(user).length;
      await request(app)
        .delete(`/users/${user}/security/sessions`)
        .set(headers)
        .expect(200, { ok: true, revoked: sessionCount - 1 });
      const security = await request(app).get(`/users/${user}/security`).set(headers).expect(200);
      expect(security.body.sessions).toHaveLength(1);
      expect(security.body.sessions[0].isActive).toBe(true);
    },
  );

  it('keeps administrator tools protected from regular and operate-under sessions', async () => {
    const { user, cookie } = await getDemoSession();
    const admin = `${user}admin`;
    userAndAuthRepository.createInitialAdminUser(admin, 'admin-password');
    const adminSession = userAndAuthRepository.createUserSession(admin, 3600);
    const adminCookie = `${SESSION_COOKIE_NAME}=${adminSession}`;
    const oucSession = userAndAuthRepository.createOucUserSession(user);

    for (const method of ['patch', 'delete'] as const) {
      await request(app)[method]('/users').query({ name: user }).expect(401);
      await request(app)
        [method]('/users')
        .query({ name: user })
        .set('Cookie', cookie)
        .send({ actingUsername: admin })
        .expect(403, { error: 'forbidden' });
      await request(app)
        [method]('/users')
        .query({ name: user })
        .set('Cookie', adminCookie)
        .set(OUC_SESSION_HEADER, oucSession)
        .expect(403, { error: 'forbidden' });
    }
    await request(app)
      .patch(`/users/${user}`)
      .set('Cookie', cookie)
      .send({ displayName: 'Changed name', actingUsername: admin })
      .expect(403, forbidden);
    expect(userAndAuthRepository.isUserPasswordValid(user, 'original-password')).toBe(true);
    expect(configService.readUserConfigText(user)).toBe(configText);
  });

  it.each(['forged', 'expired', 'revoked', 'ordinary'])(
    'does not bypass demo restrictions with a %s OUC header',
    async (tokenType) => {
      const { user, cookie } = await getDemoSession();
      let sessionId = 'OUC_forged-session';
      if (tokenType === 'expired') {
        sessionId = userAndAuthRepository.createOucUserSession(user, -1);
      } else if (tokenType === 'revoked') {
        sessionId = userAndAuthRepository.createOucUserSession(user);
        userAndAuthRepository.revokeUserSession(sessionId);
      } else if (tokenType === 'ordinary') {
        sessionId = userAndAuthRepository.createUserSession(user, 3600);
      }

      await request(app)
        .patch(`/users/${user}`)
        .set('Cookie', cookie)
        .set(OUC_SESSION_HEADER, sessionId)
        .send({ displayName: 'Changed name' })
        .expect(403, forbidden);

      const { token } = userAndAuthRepository.issuePasswordResetToken(user, 'reset');
      await request(app)
        .post('/auth/reset-password')
        .set(OUC_SESSION_HEADER, sessionId)
        .send({ token, newPassword: 'changed-password' })
        .expect(403, forbidden);
      expect(userAndAuthRepository.getUserProfile(user).displayName).toBe('Demo User');
      expect(userAndAuthRepository.isUserPasswordValid(user, 'original-password')).toBe(true);
      expect(userAndAuthRepository.lookupValidPasswordResetToken(token)).not.toBeNull();
    },
  );

  it('keeps OUC changes scoped to the account represented by the token', async () => {
    const { user } = await getDemoSession();
    const { user: otherUser } = await getDemoSession();
    const sessionId = userAndAuthRepository.createOucUserSession(user);

    await request(app)
      .patch(`/users/${otherUser}`)
      .set(OUC_SESSION_HEADER, sessionId)
      .send({ displayName: 'Changed name' })
      .expect(403, { error: 'forbidden' });

    expect(userAndAuthRepository.getUserProfile(otherUser).displayName).toBe('Demo User');
  });

  it.each(['admin', 'ouc'])(
    'allows password recovery through an active %s session and isolates concurrent demo requests',
    async (sessionType) => {
      const { user, cookie } = await getDemoSession();
      const { cookie: adminCookie } = await getDemoSession({ admin: true });
      const headers =
        sessionType === 'admin'
          ? { Cookie: adminCookie }
          : { [OUC_SESSION_HEADER]: userAndAuthRepository.createOucUserSession(user) };
      new EmailSettingsRepository().setResendSettings({
        apiKey: 're_test',
        fromEmail: 'sender@example.com',
        updatedAt: 1,
      });
      let releaseEmail!: () => void;
      let emailStarted!: () => void;
      const emailPending = new Promise<void>((resolve) => {
        releaseEmail = resolve;
      });
      const emailReady = new Promise<void>((resolve) => {
        emailStarted = resolve;
      });
      const sendEmail = vi
        .spyOn(EmailService.prototype, 'sendEmail')
        .mockImplementation(async () => {
          emailStarted();
          await emailPending;
        });

      const recovery = request(app)
        .post('/auth/forgot-password')
        .set(headers)
        .send({ email: `${user}@example.com` })
        .expect(200)
        .then((response: { body: unknown }) => response);
      await Promise.race([emailReady, recovery]);
      try {
        await request(app)
          .patch(`/users/${user}`)
          .set('Cookie', cookie)
          .send({ displayName: 'Changed name' })
          .expect(403, forbidden);
        await request(app)
          .post('/auth/forgot-password')
          .send({ email: `${user}@example.com` })
          .expect(403, forbidden);
      } finally {
        releaseEmail();
        await recovery;
      }

      expect(sendEmail).toHaveBeenCalledOnce();
      const resetUrl = sendEmail.mock.calls[0]?.[0].text.match(/Reset your password: (\S+)/)?.[1];
      const token = new URL(resetUrl!).searchParams.get('token');
      await request(app)
        .post('/auth/reset-password')
        .set(headers)
        .send({ token, newPassword: 'changed-password' })
        .expect(200, { ok: true });
      expect(userAndAuthRepository.isUserPasswordValid(user, 'changed-password')).toBe(true);
    },
  );

  it('still validates the current password for administrators', async () => {
    const { user, cookie } = await getDemoSession({ admin: true });

    await request(app)
      .post(`/users/${user}/password`)
      .set('Cookie', cookie)
      .send({ currentPassword: 'wrong-password', newPassword: 'changed-password' })
      .expect(401, { error: 'current password is incorrect' });

    expect(userAndAuthRepository.isUserPasswordValid(user, 'original-password')).toBe(true);
  });

  it('allows internal service calls without HTTP request context', async () => {
    const { user } = await getDemoSession({ admin: true });

    expect(new UserService().patchUser(user, { displayName: 'Changed name' })).toEqual({
      ok: true,
      username: user,
    });
    expect(userAndAuthRepository.getUserProfile(user).displayName).toBe('Changed name');
  });

  it('resolves recovery privileges from the requested account rather than other body fields', async () => {
    const { user } = await getDemoSession();
    const { user: admin } = await getDemoSession({ admin: true });
    const { token } = userAndAuthRepository.issuePasswordResetToken(user, 'reset');
    const { token: adminToken } = userAndAuthRepository.issuePasswordResetToken(admin, 'reset');
    new EmailSettingsRepository().setResendSettings({
      apiKey: 're_test',
      fromEmail: 'sender@example.com',
      updatedAt: 1,
    });
    const sendEmail = vi.spyOn(EmailService.prototype, 'sendEmail').mockResolvedValue();

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: `${user}@example.com`, token: adminToken, admin: true })
      .expect(403, forbidden);
    await request(app)
      .post('/auth/reset-password')
      .send({ token, email: `${admin}@example.com`, admin: true, newPassword: 'changed-password' })
      .expect(403, forbidden);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(userAndAuthRepository.isUserPasswordValid(user, 'original-password')).toBe(true);
    expect(userAndAuthRepository.lookupValidPasswordResetToken(token)).not.toBeNull();
  });

  it('allows password recovery for administrator accounts without a signed-in session', async () => {
    const { user } = await getDemoSession({ admin: true });
    new EmailSettingsRepository().setResendSettings({
      apiKey: 're_test',
      fromEmail: 'sender@example.com',
      updatedAt: 1,
    });
    const sendEmail = vi.spyOn(EmailService.prototype, 'sendEmail').mockResolvedValue();
    const resolveUsername = vi.spyOn(UserAndAuthRepository.prototype, 'resolveUsernameByLoginId');
    const lookupResetToken = vi.spyOn(
      UserAndAuthRepository.prototype,
      'lookupValidPasswordResetToken',
    );

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: ` ${user.toUpperCase()}@EXAMPLE.COM ` })
      .expect(200);

    expect(resolveUsername).toHaveBeenCalledExactlyOnceWith(`${user}@example.com`);
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ to: `${user}@example.com` }),
    );
    const resetUrl = sendEmail.mock.calls[0]?.[0].text.match(/Reset your password: (\S+)/)?.[1];
    expect(resetUrl).toBeTruthy();
    const token = new URL(resetUrl!).searchParams.get('token');
    await request(app)
      .post('/auth/reset-password')
      .send({ token, newPassword: 'changed-password' })
      .expect(200, { ok: true });
    expect(lookupResetToken).toHaveBeenCalledExactlyOnceWith(token);
    expect(userAndAuthRepository.isUserPasswordValid(user, 'changed-password')).toBe(true);
    expect(userAndAuthRepository.isUserAdmin(user)).toBe(true);
    expect(userAndAuthRepository.lookupValidPasswordResetToken(token!)).toBeNull();
  });

  it.each(['text', 'config'])('allows administrators to save %s configuration', async (format) => {
    const { user, cookie } = await getDemoSession({ admin: true });
    const response = await request(app)
      .get(`/users/${user}/config`)
      .set('Cookie', cookie)
      .expect(200);

    await request(app)
      .put(`/users/${user}/config`)
      .set('Cookie', cookie)
      .send({ [format]: response.body[format] })
      .expect(200, { ok: true, user });
  });

  it.each(['journal', 'weekly notes'])(
    'allows administrators to update and clear %s',
    async (habit) => {
      const { user, cookie } = await getDemoSession({ admin: true });
      for (const body of [{ text: 'Updated note' }, { text: '' }, { action: 'clear' }]) {
        await request(app)
          .patch(`/users/${user}/habits`)
          .set('Cookie', cookie)
          .send({ habit, date, ...body })
          .expect(200);
      }
    },
  );

  it.each([
    { flag: undefined, admin: false, ouc: null },
    { flag: 'false', admin: false, ouc: null },
    { flag: 'true', admin: true, ouc: null },
    { flag: 'true', admin: false, ouc: 'header' },
    { flag: 'true', admin: false, ouc: 'cookie' },
  ])(
    'allows ordinary edits with demo=$flag, admin=$admin and ouc=$ouc',
    async ({ flag, admin, ouc }) => {
      const { app, user, cookie } = await getDemoSession({ admin });
      vi.stubEnv('HABSUM_ENABLE_DEMO', flag);
      let headers: Record<string, string> = { Cookie: cookie };
      if (ouc) {
        const { cookie: adminCookie } = await getDemoSession({ admin: true });
        const response = await request(app)
          .post('/users/ouc')
          .query({ name: user })
          .set('Cookie', adminCookie)
          .expect(201);
        expect(response.body.token).toMatch(/^OUC_/);
        headers =
          ouc === 'header'
            ? { [OUC_SESSION_HEADER]: response.body.token }
            : { Cookie: `${SESSION_COOKIE_NAME}=${response.body.token}` };
      }
      const renamedUser = `${user}renamed`;
      await request(app)
        .patch(`/users/${user}`)
        .set(headers)
        .send({ username: renamedUser, displayName: 'New name', email: `${user}new@example.com` })
        .expect(200);
      expect(userAndAuthRepository.getUserProfile(renamedUser)).toMatchObject({
        displayName: 'New name',
        email: `${user}new@example.com`,
      });
      await request(app)
        .put(`/users/${renamedUser}/config`)
        .set(headers)
        .send({ text: configText.replace('goal: 8', 'goal: 10') })
        .expect(200);
      expect(configService.loadUserConfig(renamedUser)?.habits).toContainEqual(
        expect.objectContaining({ name: 'water', settings: expect.objectContaining({ goal: 10 }) }),
      );
      await request(app)
        .patch(`/users/${renamedUser}/habits`)
        .set(headers)
        .send({ habit: 'journal', date, text: 'Updated note' })
        .expect(200);
      await request(app)
        .post(`/users/${renamedUser}/password`)
        .set(headers)
        .send({ currentPassword: 'original-password', newPassword: 'changed-password' })
        .expect(200);
      expect(userAndAuthRepository.isUserPasswordValid(renamedUser, 'changed-password')).toBe(true);
      await request(app).delete(`/users/${renamedUser}`).set(headers).expect(200);
      expect(configService.loadUserConfig(renamedUser)).toBeNull();
    },
  );
});
