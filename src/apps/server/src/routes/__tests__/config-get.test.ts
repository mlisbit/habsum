import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();

function writeUserConfig(user: string, text: string) {
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(user, yamlString(text));
  if (!written.ok) throw new Error(written.error);
}

describe('GET /users/:user/config', () => {
  it('attaches the requested user after parsing configuration data', () => {
    const user = 'config-data-context-user';
    const text = yamlString('user: ignored\nhabits: {}\n');
    const expected = { user, includeAbsentDaysInAverage: false, habits: [] };

    expect(configService.validateUserConfigText(user, text)).toEqual({
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
    expect(res.body.config).toMatchObject({
      user,
      includeAbsentDaysInAverage: false,
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

  it('accepts structured config json on the original config endpoint', async () => {
    const user = 'config-json-put-user';
    writeUserConfig(
      user,
      `include_absent_days_in_average: false

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
          user,
          includeAbsentDaysInAverage: true,
          habits: [
            { name: 'pages', type: 'summation', goal: null, repeat: ['tuesday', 'thursday'] },
          ],
        },
      })
      .expect(200);

    const res = await request(createApp())
      .get(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.config.includeAbsentDaysInAverage).toBe(true);
    expect(res.body.text.startsWith('# version: 1\n')).toBe(true);
    expect(res.body.text).toContain('include_absent_days_in_average: true');
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
          user,
          includeAbsentDaysInAverage: false,
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
          user,
          includeAbsentDaysInAverage: false,
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
