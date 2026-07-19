import { join } from 'node:path';
import Database from 'better-sqlite3';
import request from 'supertest';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import {
  createUserSession,
  ensureUserPins,
  getAllTotals,
  getSelect,
  setSelect,
  setTotal,
} from '../../db.js';
import { SESSION_COOKIE_NAME } from '../../session-cookie.js';

const configService = new ConfigService();

function writeUserConfig(user: string, text: string) {
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(user, yamlString(text));
  if (!written.ok) throw new Error(written.error);
}

describe('PUT /users/:user/config migrations', () => {
  it('backfills the active config version when the user row is created after config import', async () => {
    const user = 'config-active-backfill-user';
    writeUserConfig(
      user,
      `habits:
  first:
    type: summation
`,
    );

    const session = createUserSession(user, 3600);
    await request(createApp())
      .get(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);
    ensureUserPins([user]);

    const sqlite = new Database(join(process.env.HABSUM_CONFIG_DIR!, 'habsum.db'));
    try {
      const active = sqlite
        .prepare('SELECT active_habit_config_version FROM users WHERE username = ?')
        .get(user) as { active_habit_config_version: number };
      expect(active.active_habit_config_version).toBe(2);
    } finally {
      sqlite.close();
    }
  });

  it('stores user config versions in the database and keeps the two previous revisions', async () => {
    const user = 'config-versioning-user';
    writeUserConfig(
      user,
      `habits:
  first:
    type: summation
`,
    );
    ensureUserPins([user]);
    const session = createUserSession(user, 3600);

    for (const habit of ['second', 'third', 'fourth']) {
      await request(createApp())
        .put(`/users/${user}/config`)
        .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
        .send({
          text: `habits:
  ${habit}:
    type: summation
`,
          migrations: [],
          deletions: [],
        })
        .expect(200);
    }

    const sqlite = new Database(join(process.env.HABSUM_CONFIG_DIR!, 'habsum.db'));
    try {
      const rows = sqlite
        .prepare(
          `
            SELECT version, text
            FROM habit_configs
            WHERE user = ?
            ORDER BY version
          `,
        )
        .all(user) as Array<{ version: number; text: string }>;

      expect(rows.map((row) => row.version)).toEqual([3, 4, 5]);
      expect(rows.at(-1)?.text).toContain('fourth');
      const active = sqlite
        .prepare('SELECT active_habit_config_version FROM users WHERE username = ?')
        .get(user) as { active_habit_config_version: number };
      expect(active.active_habit_config_version).toBe(5);

      sqlite
        .prepare('UPDATE users SET active_habit_config_version = ? WHERE username = ?')
        .run(4, user);
    } finally {
      sqlite.close();
    }

    const activeRes = await request(createApp())
      .get(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);
    expect(activeRes.body.text).toContain('third');
    expect(activeRes.body.text).not.toContain('fourth');
  });

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
        deletions: [],
      })
      .expect(200);

    expect(getAllTotals(user, 'push ups')).toEqual([]);
    expect(getAllTotals(user, 'pushups')).toEqual([{ date: '2025-01-01', total: 12 }]);
    expect(getSelect(user, 'mood', '2025-01-01')).toBe('wrecked');
  });

  it('deletes historical option data for config deletions', async () => {
    const user = 'config-deletions-user';
    writeUserConfig(
      user,
      `habits:
  mood:
    type: single_select
    options: [blackout, okay]
`,
    );
    ensureUserPins([user]);
    setSelect(user, 'mood', '2025-01-01', 'blackout');
    setSelect(user, 'mood', '2025-01-02', 'okay');

    const session = createUserSession(user, 3600);
    const nextText = `habits:
  mood:
    type: single_select
    options: [okay]
`;

    await request(createApp())
      .put(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({
        text: nextText,
        migrations: [],
        deletions: ['mood.blackout'],
      })
      .expect(200);

    expect(getSelect(user, 'mood', '2025-01-01')).toBeNull();
    expect(getSelect(user, 'mood', '2025-01-02')).toBe('okay');
  });
});
