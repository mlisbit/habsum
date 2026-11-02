import Database from 'better-sqlite3';
import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';
import getDatabasePath from '../../utils/get-database-path.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

function writeUserConfig(user: string, text: string) {
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(user, yamlString(text));
  if (!written.ok) throw new Error(written.error);
}

describe('GET /users/:user/config', () => {
  it('returns the requested revision without changing the active config', async () => {
    const user = 'config-historical-user';
    writeUserConfig(user, 'habits:\n  previous:\n    type: summation\n');
    const previousText = configService.readUserConfigText(user);
    expect(
      configService.writeUserConfigText(user, yamlString('habits:\n  current:\n    type: text\n'))
        .ok,
    ).toBe(true);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();
    const cookie = `${SESSION_COOKIE_NAME}=${session}`;
    const sqlite = new Database(getDatabasePath());
    try {
      const updateSavedAt = sqlite.prepare(
        'UPDATE habit_configs SET created_at = ? WHERE user = ? AND version = ?',
      );
      for (const version of [1, 2, 3]) {
        updateSavedAt.run(`2026-11-0${version} 16:30:00`, user, version);
      }
    } finally {
      sqlite.close();
    }

    const historical = await request(app)
      .get(`/users/${user}/config?v=2`)
      .set('Cookie', cookie)
      .expect(200);
    expect(historical.body.text).toBe(previousText);
    expect(historical.body.config.habits).toEqual([
      expect.objectContaining({ name: 'previous', type: 'summation' }),
    ]);
    expect(historical.body.versions).toEqual([
      { version: 3, savedAt: '2026-11-03 16:30:00', isCurrent: true },
      { version: 2, savedAt: '2026-11-02 16:30:00', isCurrent: false },
      { version: 1, savedAt: '2026-11-01 16:30:00', isCurrent: false },
    ]);

    const current = await request(app)
      .get(`/users/${user}/config`)
      .set('Cookie', cookie)
      .expect(200);
    expect(current.body.config.habits).toEqual([
      expect.objectContaining({ name: 'current', type: 'text' }),
    ]);
    expect(current.body.text).toBe(configService.readUserConfigText(user));
    expect(current.body.versions).toEqual(historical.body.versions);
  });

  it('returns 404 for missing and pruned revisions', async () => {
    const user = 'config-missing-revision-user';
    writeUserConfig(user, 'habits: {}\n');
    expect(configService.writeUserConfigText(user, yamlString('habits: {}\n')).ok).toBe(true);
    expect(configService.writeUserConfigText(user, yamlString('habits: {}\n')).ok).toBe(true);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();

    const current = await request(app)
      .get(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);
    expect(current.body.versions.map(({ version }: { version: number }) => version)).toEqual([
      4, 3, 2,
    ]);

    for (const version of [1, 999]) {
      await request(app)
        .get(`/users/${user}/config?v=${version}`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
        .expect(404, { error: `config version ${version} not found` });
    }
  });

  it('rejects invalid version query parameters instead of returning the active config', async () => {
    const user = 'config-invalid-revision-user';
    writeUserConfig(user, 'habits: {}\n');
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const app = createApp();

    for (const query of [
      'v=',
      'v=0',
      'v=-1',
      'v=1.5',
      'v=abc',
      'v=1e2',
      'v=9007199254740992',
      'v=1&v=2',
      'v[number]=1',
    ]) {
      await request(app)
        .get(`/users/${user}/config?${query}`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
        .expect(400, { error: 'v must be a positive integer' });
    }
  });

  it('keeps historical configs restricted to the authenticated user', async () => {
    const user = 'config-revision-owner';
    const otherUser = 'config-revision-other-user';
    writeUserConfig(user, 'habits: {}\n');
    writeUserConfig(otherUser, 'habits: {}\n');
    userAndAuthRepository.setUserPassword(user, 'test-password');
    userAndAuthRepository.setUserPassword(otherUser, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    await request(createApp())
      .get(`/users/${otherUser}/config?v=1`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(403, { error: 'forbidden' });
  });

  it('returns only configuration data when validating and loading configs', () => {
    const user = 'config-data-context-user';
    const text = yamlString('user: ignored\nhabits: {}\n');
    const expected = { habits: [] };

    expect(configService.validateUserConfigText(text)).toEqual({
      ok: true,
      config: expected,
    });
    expect(configService.createEmptyUserConfig(user).ok).toBe(true);
    expect(configService.writeUserConfigText(user, text).ok).toBe(true);
    expect(configService.loadUserConfig(user)).toEqual(expected);
  });

  it('adds a single version comment when creating and saving raw configs', () => {
    const user = 'config-version-comment-user';
    expect(configService.createEmptyUserConfig(user).ok).toBe(true);
    expect(configService.readUserConfigText(user)).toBe('# version: 1\nhabits: {}\n');

    const text = yamlString('# My habits\nhabits: {}\n');
    expect(configService.writeUserConfigText(user, text).ok).toBe(true);
    const saved = configService.readUserConfigText(user)!;
    expect(saved).toBe(`# version: 1\n${text}`);
    expect(configService.writeUserConfigText(user, saved).ok).toBe(true);
    expect(configService.readUserConfigText(user)).toBe(saved);
  });

  it('returns parsed config json and habit cards', async () => {
    const user = 'config-json-user';
    writeUserConfig(
      user,
      `habits:
  mood:
    type: single_select
    repeat: [monday, wednesday]
    options: [good, okay, bad]
  push ups:
    type: summation
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    const res = await request(createApp())
      .get(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.insights).toBeUndefined();
    expect(res.body.config).not.toHaveProperty('user');
    expect(res.body.config).toMatchObject({
      habits: [
        {
          name: 'mood',
          type: 'single_select',
          goal: null,
          repeat: ['monday', 'wednesday'],
          options: ['good', 'okay', 'bad'].map((label) => ({ label, sentiment: 'positive' })),
        },
        {
          name: 'push ups',
          type: 'summation',
          repeat: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
      ],
    });
    expect(res.body.config.habits[0].settings).toBeUndefined();
    expect(res.body.habits).toBeUndefined();
  });

  it('saves structured config and drops the retired averaging setting from older YAML', async () => {
    const user = 'config-json-put-user';
    writeUserConfig(
      user,
      `include_absent_days_in_average: true

habits:
  pages:
    type: summation
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    await request(createApp())
      .put(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({
        config: {
          habits: [
            { name: 'pages', type: 'summation', goal: null, repeat: ['tuesday', 'thursday'] },
          ],
        },
      })
      .expect(200, { ok: true, user });

    const res = await request(createApp())
      .get(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.config).not.toHaveProperty('includeAbsentDaysInAverage');
    expect(res.body.text.startsWith('# version: 1\n')).toBe(true);
    expect(res.body.text).not.toContain('include_absent_days_in_average');
    expect(res.body.text).toContain('repeat: [tuesday, thursday]');
  });

  it('round-trips text habit reset schedules through YAML and structured config', async () => {
    const user = 'config-json-text-reset-user';
    writeUserConfig(
      user,
      `habits:
  journal:
    type: text
    reset: [saturday]
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);
    const cookie = `${SESSION_COOKIE_NAME}=${session}`;
    const app = createApp();

    const initial = await request(app)
      .get(`/users/${user}/config`)
      .set('Cookie', cookie)
      .expect(200);
    expect(initial.body.config.habits[0].reset).toEqual(['saturday']);

    await request(app)
      .put(`/users/${user}/config`)
      .set('Cookie', cookie)
      .send({
        config: {
          habits: [
            {
              name: 'journal',
              type: 'text',
              goal: null,
              reset: ['friday'],
            },
          ],
        },
      })
      .expect(200);

    const updated = await request(app)
      .get(`/users/${user}/config`)
      .set('Cookie', cookie)
      .expect(200);
    expect(updated.body.config.habits[0].reset).toEqual(['friday']);
    expect(updated.body.text).toContain('reset: [friday]');
  });

  it('rejects unsupported themes in structured config json', async () => {
    const user = 'config-json-theme-user';
    writeUserConfig(
      user,
      `habits:
  mood:
    type: single_select
    options: [yes, no]
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    const res = await request(createApp())
      .put(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({
        config: {
          habits: [
            {
              name: 'mood',
              type: 'single_select',
              goal: null,
              options: ['yes', 'no'],
              theme: 'dark',
            },
          ],
        },
      })
      .expect(400);

    expect(res.body).toEqual({ error: 'habit "mood" theme must be "checkbox"' });
  });

  it('stores YAML editor saves using the new config schema', async () => {
    const user = 'legacy-config-save-user';
    const legacy = `habits:
  push ups:
    type: summation
    goal: 100
    history:
      displays: [weekly_history]
      period: 3w
    streak:
      options: ['100']
      show_longest: true
`;
    writeUserConfig(user, legacy);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    await request(createApp())
      .put(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({ text: legacy })
      .expect(200);

    const saved = configService.readUserConfigText(user);
    expect(saved?.startsWith('# version: 1\n')).toBe(true);
    expect(saved).toContain('data_visualization:');
    expect(saved).toContain('insights:');
    expect(saved).toContain('streak_options:');
    expect(saved).not.toContain('history:');
    expect(saved).not.toContain('\n    streak:');
  });

  it('rejects unsupported commented versions without overwriting the config', async () => {
    const user = 'config-unsupported-version-user';
    writeUserConfig(user, 'habits: {}\n');
    const saved = configService.readUserConfigText(user);
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

    await request(createApp())
      .put(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({ text: '# version: 2\nhabits: {}\n' })
      .expect(400, { error: 'unsupported yaml config version: 2' });

    expect(configService.readUserConfigText(user)).toBe(saved);
  });
});
