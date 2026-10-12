import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import demoData from './demo-data.ts';

test('uses active config, matches graph windows, preserves data and leaves missing days', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'habsum-demo-'));
  const databasePath = join(directory, 'test.db');
  const db = new Database(databasePath);
  try {
    db.exec(`
      CREATE TABLE users (username TEXT, active_habit_config_version INTEGER);
      CREATE TABLE habit_configs (user TEXT, version INTEGER, text TEXT);
      CREATE TABLE habit_summation_events (user TEXT, habit TEXT, date TEXT, amount INTEGER);
      CREATE TABLE habit_daily_selects (user TEXT, habit TEXT, date TEXT, value TEXT, PRIMARY KEY(user, habit, date));
      CREATE TABLE habit_text (user TEXT, habit TEXT, date TEXT, text TEXT, PRIMARY KEY(user, habit, date));
      INSERT INTO users VALUES ('alice', 1);
      INSERT INTO habit_configs VALUES ('alice', 2, 'habits: {}');
      INSERT INTO habit_summation_events VALUES ('alice', 'push ups', '2026-10-12', 99);
    `);
    db.query('INSERT INTO habit_configs VALUES (?, ?, ?)').run(
      'alice',
      1,
      `habits:
  push ups:
    goal: 20
    data_visualization:
      bargraph: {period: 2w}
  daily:
    data_visualization:
      heatmap: {}
  weekly:
    goal: 10
    data_visualization:
      heatmap: {}
    streak_options: {frequency: 3d}
  mood:
    type: single_select
    options: [good, bad]
  journal:
    type: text
`,
    );
    let seed = 123;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    await demoData('alice', { databasePath, today: '2026-10-12', random, writeLine: () => {} });
    const rows = db
      .query<
        { date: string; amount: number },
        []
      >("SELECT date, amount FROM habit_summation_events WHERE habit = 'push ups'")
      .all();
    expect(rows.every((row) => row.date >= '2026-09-29' && row.date <= '2026-10-12')).toBe(true);
    expect(rows.length).toBeLessThan(14);
    expect(rows.some((row) => row.amount < 20)).toBe(true);
    expect(rows.some((row) => row.amount >= 20 && row.amount < 30)).toBe(true);
    expect(rows.find((row) => row.date === '2026-10-12')?.amount).toBe(99);
    expect(
      db.query("SELECT min(date) AS date FROM habit_summation_events WHERE habit = 'daily'").get(),
    ).toEqual({ date: '2025-10-12' });
    expect(
      db.query("SELECT min(date) AS date FROM habit_summation_events WHERE habit = 'weekly'").get(),
    ).toEqual({ date: '2024-05-21' });
    await expect(demoData('missing', { databasePath })).rejects.toThrow('user not found');
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
