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
    userAndAuthRepository.ensureUserPins([user]);
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
          repeat: ['monday', 'wednesday'],
          options: ['good', 'okay', 'bad'],
        },
        {
          name: 'push ups',
          type: 'summation',
          repeat: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
      ],
    });
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
    userAndAuthRepository.ensureUserPins([user]);
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
    expect(res.body.text).toContain('include_absent_days_in_average: true');
    expect(res.body.text).toContain('repeat: [tuesday, thursday]');
  });
});
