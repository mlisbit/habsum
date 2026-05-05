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
  CREATE TABLE IF NOT EXISTS habit_summation_events (
    id INTEGER PRIMARY KEY,
    user TEXT NOT NULL,
    habit TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS habit_summation_events_day_idx
    ON habit_summation_events (user, habit, date, id);
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

export type SummationEventRow = {
  id: number;
  date: string;
  amount: number;
  createdAt: string;
};

type TotalRow = { total: number; eventCount: number };
type FirstDateRow = { date: string };
type SeriesRow = { date: string; total: number };
type SelectRow = { value: string };
type SelectSeriesRow = { date: string; value: string };

const getDailyTotalStmt = db.prepare<[string, string, string], TotalRow>(
  `
    SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS eventCount
    FROM habit_summation_events
    WHERE user = ? AND habit = ? AND date = ?
  `,
);

const insertSummationEventStmt = db.prepare<
  {
    user: string;
    habit: string;
    date: string;
    amount: number;
  },
  SummationEventRow
>(`
  INSERT INTO habit_summation_events (user, habit, date, amount, created_at)
  VALUES (@user, @habit, @date, @amount, datetime('now'))
  RETURNING id, date, amount, created_at AS createdAt
`);

const deleteSummationEventsForDayStmt = db.prepare<{
  user: string;
  habit: string;
  date: string;
}>(`
  DELETE FROM habit_summation_events
  WHERE user = @user AND habit = @habit AND date = @date
`);

const firstDateStmt = db.prepare<[string, string], FirstDateRow>(`
  SELECT MIN(date) AS date
  FROM (
    SELECT date FROM habit_summation_events WHERE user = ?
    UNION ALL
    SELECT date FROM habit_daily_selects WHERE user = ?
  )
`);

const seriesStmt = db.prepare<[string, string, string, string], SeriesRow>(`
  SELECT date, SUM(amount) AS total
  FROM habit_summation_events
  WHERE user = ? AND habit = ? AND date >= ? AND date <= ?
  GROUP BY date
  ORDER BY date ASC
`);

const allTotalsStmt = db.prepare<[string, string], SeriesRow>(`
  SELECT date, SUM(amount) AS total
  FROM habit_summation_events
  WHERE user = ? AND habit = ?
  GROUP BY date
  ORDER BY date ASC
`);

const summationEventsForDayStmt = db.prepare<[string, string, string], SummationEventRow>(`
  SELECT id, date, amount, created_at AS createdAt
  FROM habit_summation_events
  WHERE user = ? AND habit = ? AND date = ?
  ORDER BY id ASC
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
    SELECT date FROM habit_summation_events WHERE user = ? AND habit = ?
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
  return row === undefined || row.eventCount === 0 ? null : row.total;
}

export function setTotal(user: string, habit: string, date: string, total: number): number {
  const next = Math.max(0, Math.trunc(total));
  deleteSummationEventsForDayStmt.run({ user, habit, date });
  if (next > 0) {
    insertSummationEventStmt.get({ user, habit, date, amount: next });
  }
  return next;
}

export function addToTotal(
  user: string,
  habit: string,
  date: string,
  delta: number,
): { total: number | null; event: SummationEventRow | null } {
  const current = getSummationDayTotal(user, habit, date);
  const base = current ?? 0;
  const requested = Math.trunc(delta);
  const amount = requested < 0 ? Math.max(requested, -base) : requested;
  if (amount === 0) return { total: current, event: null };

  const event = insertSummationEventStmt.get({ user, habit, date, amount });
  if (!event) throw new Error('failed to record summation event');
  return { total: base + amount, event };
}

export function deleteSummationEventsForDay(user: string, habit: string, date: string): void {
  deleteSummationEventsForDayStmt.run({ user, habit, date });
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

export function getSummationEvents(user: string, habit: string, date: string): SummationEventRow[] {
  return summationEventsForDayStmt.all(user, habit, date);
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
  db.prepare('DELETE FROM habit_summation_events WHERE user = ?').run(user);
  db.prepare('DELETE FROM habit_daily_selects WHERE user = ?').run(user);
}

export function closeDb() {
  db.close();
}
