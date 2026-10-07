import Database from 'better-sqlite3';
import request from 'supertest';
import { dayFromString } from '@habsum/types/common/day';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { ConfigService } from '../../services/config-service.js';
import { HabitRepository } from '../../repositories/habit-repository.js';
import getHabitListDataQuery from '../../utils/get-habit-list-data-query.js';
import { UserAndAuthRepository } from '../../repositories/user-and-auth-repository.js';
import { SESSION_COOKIE_NAME } from '../../utils/cookie-session-utils.js';
import getDatabasePath from '../../utils/get-database-path.js';

const configService = new ConfigService();
const habitRepository = new HabitRepository();
const userAndAuthRepository = new UserAndAuthRepository();

function writeUserConfig(user: string, text: string) {
  const created = configService.createEmptyUserConfig(user);
  if (!created.ok) throw new Error(created.error);
  const written = configService.writeUserConfigText(user, yamlString(text));
  if (!written.ok) throw new Error(written.error);
}

function hydratedSelectValue(user: string, habit: string, date: string): string | null {
  const config = configService.loadUserConfig(user);
  if (!config) throw new Error(`missing config for ${user}`);
  const viewDate = dayFromString(date);
  const hydratedHabits = habitRepository.loadHydratedHabits(
    getHabitListDataQuery({
      config,
      context: {
        viewDate,
        today: viewDate,
      },
    }),
  );
  const habitData = hydratedHabits.find((candidate) => candidate.name === habit);
  if (!habitData || habitData.type !== 'single_select') return null;
  return habitData.values.find((row) => row.date === date)?.value ?? null;
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

    const session = userAndAuthRepository.createUserSession(user, 3600);
    await request(createApp())
      .get(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .expect(200);
    userAndAuthRepository.setUserPassword(user, 'test-password');

    const sqlite = new Database(getDatabasePath());
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
    userAndAuthRepository.setUserPassword(user, 'test-password');
    const session = userAndAuthRepository.createUserSession(user, 3600);

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

    const sqlite = new Database(getDatabasePath());
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
  journal:
    type: text
`,
    );
    userAndAuthRepository.setUserPassword(user, 'test-password');
    habitRepository.applyHabitMutation({
      kind: 'set_total',
      user,
      habit: 'push ups',
      date: dayFromString('2025-01-01'),
      total: 12,
      createdAt: '2025-01-01 10:00:00',
    });
    habitRepository.applyHabitMutation({
      kind: 'set_select',
      user,
      habit: 'mood',
      date: dayFromString('2025-01-01'),
      value: 'blackout',
    });
    habitRepository.applyHabitMutation({
      kind: 'set_text',
      user,
      habit: 'journal',
      date: dayFromString('2025-01-01'),
      text: 'A thought.',
    });

    const session = userAndAuthRepository.createUserSession(user, 3600);
    const nextText = `habits:
  pushups:
    type: summation
  mood:
    type: single_select
    options: [wrecked, okay]
  daily journal:
    type: text
`;

    await request(createApp())
      .put(`/users/${user}/config`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=${session}`)
      .send({
        text: nextText,
        migrations: [
          ['push ups', 'pushups'],
          ['mood.blackout', 'mood.wrecked'],
          ['journal', 'daily journal'],
        ],
        deletions: [],
      })
      .expect(200);

    const summationEvents = habitRepository.getDataExport(user).summationEvents;
    expect(summationEvents.filter((event) => event.habit === 'push ups')).toEqual([]);
    expect(summationEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ habit: 'pushups', date: '2025-01-01', amount: 12 }),
      ]),
    );
    expect(hydratedSelectValue(user, 'mood', '2025-01-01')).toBe('wrecked');
    expect(habitRepository.getDataExport(user).texts).toEqual([
      expect.objectContaining({
        habit: 'daily journal',
        date: '2025-01-01',
        text: 'A thought.',
      }),
    ]);
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
    userAndAuthRepository.setUserPassword(user, 'test-password');
    habitRepository.applyHabitMutation({
      kind: 'set_select',
      user,
      habit: 'mood',
      date: dayFromString('2025-01-01'),
      value: 'blackout',
    });
    habitRepository.applyHabitMutation({
      kind: 'set_select',
      user,
      habit: 'mood',
      date: dayFromString('2025-01-02'),
      value: 'okay',
    });

    const session = userAndAuthRepository.createUserSession(user, 3600);
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

    expect(hydratedSelectValue(user, 'mood', '2025-01-01')).toBeNull();
    expect(hydratedSelectValue(user, 'mood', '2025-01-02')).toBe('okay');
  });
});
