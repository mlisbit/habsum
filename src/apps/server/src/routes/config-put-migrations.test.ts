import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { ensureConfigLayout } from '../config.js';
import {
  createUserSession,
  ensureUserPins,
  getAllTotals,
  getSelect,
  setSelect,
  setTotal,
} from '../db.js';
import { SESSION_COOKIE_NAME } from '../session-cookie.js';

function writeUserConfig(user: string, text: string) {
  ensureConfigLayout();
  const usersDir = join(process.env.HABSUM_CONFIG_DIR!, 'users');
  writeFileSync(join(usersDir, `${user}.yaml`), text, 'utf8');
}

describe('PUT /users/:user/config migrations', () => {
  it('migrates historical habit and option data for config rename migrations', async () => {
    const user = 'config-migrations-user';
    writeUserConfig(
      user,
      `habits:
  push ups:
    type: summation
  mood:
    type: single_select
    options: [blackout, okay]
`,
    );
    ensureUserPins([user]);
    setTotal(user, 'push ups', '2025-01-01', 12, '2025-01-01 10:00:00');
    setSelect(user, 'mood', '2025-01-01', 'blackout');

    const session = createUserSession(user, 3600);
    const nextText = `habits:
  pushups:
    type: summation
  mood:
    type: single_select
    options: [wrecked, okay]
`;

    await request(createApp())
      .put(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({
        text: nextText,
        migrations: [
          ['push ups', 'pushups'],
          ['mood.blackout', 'mood.wrecked'],
        ],
      })
      .expect(200);

    expect(getAllTotals(user, 'push ups')).toEqual([]);
    expect(getAllTotals(user, 'pushups')).toEqual([{ date: '2025-01-01', total: 12 }]);
    expect(getSelect(user, 'mood', '2025-01-01')).toBe('wrecked');
  });
});
