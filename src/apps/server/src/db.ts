import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rawDir = process.env.HABSUM_CONFIG_DIR;
if (!rawDir) {
  throw new Error('[habsum] HABSUM_CONFIG_DIR is required (must point to your data directory)');
}

const DATA_DIR = resolve(rawDir);
const DB_PATH = join(DATA_DIR, 'habsum.db');
try {
  mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  throw new Error(
    `[habsum] could not create data directory: ${DATA_DIR}\n` +
      (e instanceof Error ? e.message : 'unknown error'),
  );
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS habit_totals (
    user  TEXT NOT NULL,
    habit TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user, habit)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS habit_daily_totals (
    user  TEXT NOT NULL,
    habit TEXT NOT NULL,
    date  TEXT NOT NULL, -- YYYY-MM-DD
    total INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user, habit, date)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS habit_daily_selects (
    user  TEXT NOT NULL,
    habit TEXT NOT NULL,
    date  TEXT NOT NULL, -- YYYY-MM-DD
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user, habit, date)
  );
`);

type TotalRow = { total: number };
type FirstDateRow = { date: string };
type SeriesRow = { date: string; total: number };
type SelectRow = { value: string };
type SelectSeriesRow = { date: string; value: string };

const getDailyTotalStmt = db.prepare<[string, string, string], TotalRow>(
  'SELECT total FROM habit_daily_totals WHERE user = ? AND habit = ? AND date = ?',
);

const upsertDailyStmt = db.prepare<{
  user: string;
  habit: string;
  date: string;
  total: number;
}>(`
  INSERT INTO habit_daily_totals (user, habit, date, total, updated_at)
  VALUES (@user, @habit, @date, @total, datetime('now'))
  ON CONFLICT(user, habit, date) DO UPDATE SET
    total = excluded.total,
    updated_at = excluded.updated_at
`);

const firstDateStmt = db.prepare<[string, string], FirstDateRow>(`
  SELECT MIN(date) AS date
  FROM (
    SELECT date FROM habit_daily_totals WHERE user = ?
    UNION ALL
    SELECT date FROM habit_daily_selects WHERE user = ?
  )
`);

const seriesStmt = db.prepare<[string, string, string, string], SeriesRow>(`
  SELECT date, total
  FROM habit_daily_totals
  WHERE user = ? AND habit = ? AND date >= ? AND date <= ?
  ORDER BY date ASC
`);

const allTotalsStmt = db.prepare<[string, string], SeriesRow>(`
  SELECT date, total
  FROM habit_daily_totals
  WHERE user = ? AND habit = ?
  ORDER BY date ASC
`);

const allSelectsStmt = db.prepare<[string, string], SelectSeriesRow>(`
  SELECT date, value
  FROM habit_daily_selects
  WHERE user = ? AND habit = ?
  ORDER BY date ASC
`);

const habitFirstDateStmt = db.prepare<[string, string, string, string], FirstDateRow>(`
  SELECT MIN(date) AS date
  FROM (
    SELECT date FROM habit_daily_totals WHERE user = ? AND habit = ?
    UNION ALL
    SELECT date FROM habit_daily_selects WHERE user = ? AND habit = ?
  )
`);

export function getFirstDate(user: string): string | null {
  const row = firstDateStmt.get(user, user);
  return row?.date ?? null;
}

/** Stored total for that calendar day, or `null` when no row exists. */
export function getSummationDayTotal(user: string, habit: string, date: string): number | null {
  const row = getDailyTotalStmt.get(user, habit, date);
  return row === undefined ? null : row.total;
}

export function setTotal(user: string, habit: string, date: string, total: number): number {
  const next = Math.max(0, Math.trunc(total));
  upsertDailyStmt.run({ user, habit, date, total: next });
  return next;
}

export function addToTotal(user: string, habit: string, date: string, delta: number): number {
  const current = getSummationDayTotal(user, habit, date);
  const base = current ?? 0;
  return setTotal(user, habit, date, base + Math.trunc(delta));
}

const deleteDailyTotalStmt = db.prepare<[string, string, string], unknown>(
  'DELETE FROM habit_daily_totals WHERE user = ? AND habit = ? AND date = ?',
);

export function deleteDailyTotal(user: string, habit: string, date: string): void {
  deleteDailyTotalStmt.run(user, habit, date);
}

export function getSeries(
  user: string,
  habit: string,
  startDate: string,
  endDate: string,
): Array<{ date: string; total: number }> {
  return seriesStmt.all(user, habit, startDate, endDate);
}

export function getAllTotals(user: string, habit: string): Array<{ date: string; total: number }> {
  return allTotalsStmt.all(user, habit);
}

export function getAllSelects(user: string, habit: string): Array<{ date: string; value: string }> {
  return allSelectsStmt.all(user, habit);
}

export function getHabitFirstDate(user: string, habit: string): string | null {
  const row = habitFirstDateStmt.get(user, habit, user, habit);
  return row?.date ?? null;
}

const getSelectStmt = db.prepare<[string, string, string], SelectRow>(
  'SELECT value FROM habit_daily_selects WHERE user = ? AND habit = ? AND date = ?',
);

const upsertSelectStmt = db.prepare<{
  user: string;
  habit: string;
  date: string;
  value: string;
}>(`
  INSERT INTO habit_daily_selects (user, habit, date, value, updated_at)
  VALUES (@user, @habit, @date, @value, datetime('now'))
  ON CONFLICT(user, habit, date) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at
`);

export function getSelect(user: string, habit: string, date: string): string | null {
  const row = getSelectStmt.get(user, habit, date);
  return row?.value ?? null;
}

export function setSelect(user: string, habit: string, date: string, value: string): string {
  upsertSelectStmt.run({ user, habit, date, value });
  return value;
}

const deleteDailySelectStmt = db.prepare<[string, string, string], unknown>(
  'DELETE FROM habit_daily_selects WHERE user = ? AND habit = ? AND date = ?',
);

export function deleteDailySelect(user: string, habit: string, date: string): void {
  deleteDailySelectStmt.run(user, habit, date);
}

export function purgeUserData(user: string) {
  db.prepare('DELETE FROM habit_daily_totals WHERE user = ?').run(user);
  db.prepare('DELETE FROM habit_daily_selects WHERE user = ?').run(user);
  db.prepare('DELETE FROM habit_totals WHERE user = ?').run(user);
}

export function closeDb() {
  db.close();
}
