import { yamlString } from '@habsum/types/common/misc';
import { toDateKey } from '@habsum/utils/date';
import YAMLConfig from '../../../server/src/utils/yaml-config/yaml-config.ts';
import getHabsumDatabase from '../utils/get-habsum-database.ts';
import getInput from '../utils/get-input.ts';
import getDemoDataStart from '../utils/get-demo-data-start.ts';

type DemoDataOptions = {
  databasePath?: string;
  today?: string;
  random?: () => number;
  writeLine?: (line: string) => void;
  readUsername?: (question: string) => Promise<string>;
};

export default async function demoData(
  username?: string,
  {
    databasePath = process.env.HABSUM_DB,
    today = toDateKey(new Date(), new Date().getTimezoneOffset()),
    random = Math.random,
    writeLine = console.log,
    readUsername = getInput,
  }: DemoDataOptions = {},
): Promise<void> {
  const user = (username ?? (await readUsername('Username: '))).trim();
  if (!user) throw new Error('username is required.');
  const database = getHabsumDatabase(databasePath, 'read-write');
  try {
    const account = database
      .query<
        { active_habit_config_version: number | null },
        [string]
      >('SELECT active_habit_config_version FROM users WHERE username = ?')
      .get(user);
    if (!account) throw new Error(`user not found: ${user}`);
    const config = database
      .query<{ text: string }, [string, number | null]>(
        `
      SELECT text FROM habit_configs WHERE user = ?
      ORDER BY (version = ?) DESC, version DESC LIMIT 1
    `,
      )
      .get(user, account.active_habit_config_version);
    if (!config) throw new Error(`habit config not found: ${user}`);
    const content = yamlString(config.text);
    const habits = new YAMLConfig(content).parse().habits;
    let inserted = 0;
    database.transaction(() => {
      for (const habit of habits) {
        const start = getDemoDataStart(habit, today);
        for (
          const date = new Date(`${start}T00:00:00Z`);
          date.toISOString().slice(0, 10) <= today;
          date.setUTCDate(date.getUTCDate() + 1)
        ) {
          const day = date.toISOString().slice(0, 10);
          const weekday = date
            .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
            .toLowerCase();
          if (!habit.repeat.includes(weekday) || random() < 0.15) continue;
          if (habit.type === 'summation') {
            const goal = habit.settings.goal;
            const roll = random();
            const amount =
              goal != null && goal > 0
                ? Math.max(
                    0,
                    Math.round(
                      goal * (roll < 0.25 ? 0.2 + random() * 0.65 : 0.95 + random() * 0.3),
                    ),
                  )
                : 1 + Math.floor(random() * 30);
            const result = database
              .query(
                `
              INSERT INTO habit_summation_events (user, habit, date, amount)
              SELECT ?, ?, ?, ? WHERE NOT EXISTS (
                SELECT 1 FROM habit_summation_events WHERE user = ? AND habit = ? AND date = ?
              )
            `,
              )
              .run(user, habit.name, day, amount, user, habit.name, day);
            inserted += result.changes;
          } else if (habit.type === 'single_select') {
            const options = habit.settings.options.map((option) => option.label);
            const eligible = habit.settings.options
              .filter((option) => option.sentiment === 'positive')
              .map((option) => option.label);
            const choices = eligible.length && random() < 0.75 ? eligible : options;
            if (!choices.length) continue;
            const value = choices[Math.floor(random() * choices.length)]!;
            inserted += database
              .query(
                'INSERT OR IGNORE INTO habit_daily_selects (user, habit, date, value) VALUES (?, ?, ?, ?)',
              )
              .run(user, habit.name, day, value).changes;
          } else {
            inserted += database
              .query(
                'INSERT OR IGNORE INTO habit_text (user, habit, date, text) VALUES (?, ?, ?, ?)',
              )
              .run(user, habit.name, day, 'Demo note: made progress today.').changes;
          }
        }
      }
    })();
    writeLine(`Created ${inserted} demo entries for ${user}; existing entries were preserved.`);
  } finally {
    database.close();
  }
}
