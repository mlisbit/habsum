import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { ensureConfigLayout } from '../config.js';
import { createUserSession, ensureUserPins, setSelect } from '../db.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

function writeUserConfig(user: string, text: string) {
  ensureConfigLayout();
  const usersDir = join(process.env.HABSUM_CONFIG_DIR!, 'users');
  writeFileSync(join(usersDir, `${user}.yaml`), text, 'utf8');
}

describe('GET /users/:user/config insights', () => {
  it('returns select options with existing data for configured habits', async () => {
    const user = 'config-insights-user';
    writeUserConfig(
      user,
      `habits:
  mood:
    type: single_select
    options: [good, okay, bad]
  push ups:
    type: summation
`,
    );
    ensureUserPins([user]);
    setSelect(user, 'mood', '2026-01-01', 'good');
    setSelect(user, 'mood', '2026-01-02', 'bad');
    const session = createUserSession(user, 3600);

    const res = await request(createApp())
      .get(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);

    expect(res.body.insights).toEqual({
      mood: { optionsWithData: ['bad', 'good'] },
      'push ups': {},
    });
  });
});
