import type { Day } from './day.js';

/** Daily streak target (`7d/1w`). Omitted from YAML when streak has no `frequency` key. */
export const DEFAULT_STREAK_FREQUENCY = '7d/1w';

/** Days per week required for the streak. Missing or invalid YAML `frequency` → 7 (every day). */
export function parseStreakFrequencyDays(spec?: string): number {
  if (typeof spec !== 'string' || spec.trim().length === 0) return 7;
  const m = spec.trim().match(/^(\d+)d\/1w$/);
  if (!m) return 7;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 7) return 7;
  return Math.trunc(n);
}

export function formatStreakFrequency(daysPerWeek: number): string {
  const n = Math.trunc(daysPerWeek);
  if (!Number.isFinite(n) || n < 1 || n > 7) {
    throw new Error('streak frequency must be between 1 and 7 per week');
  }
  return `${n}d/1w`;
}

export function isDailyStreakFrequency(daysPerWeek: number): boolean {
  return daysPerWeek >= 7;
}

/** Signed heatmap intensity: negative is unsuccessful, positive is successful/progress, and 0 is empty. */
export type StreakFill = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;

export type StreakDatum = {
  /** Period date key. Daily streaks use the calendar day; weekly streaks use the week-start Monday. */
  date: Day;
  /** Day: logged option, or `null`. Week: progress label (e.g. `2/3`), or `null` if nothing logged. */
  value: string | null;
  /** Signed dot fill intensity from `-5` to `5`; omitted when there is no logged data. */
  fill?: StreakFill;
  /** When true, highlight this period with an accent outline. */
  outline?: boolean;
  /** When true, visually de-emphasize this period. */
  dimmed?: boolean;
  /** Week buckets: inclusive calendar range for this cell (e.g. `Mon, Jan 6 – Sun, Jan 12`). */
  label?: string;
};

/** Longest historical streak when YAML sets `streak.show_longest`. */
export type LongestStreak = {
  /** Display label for the longest streak row. */
  label: string;
  /** e.g. `3 days` or `2 weeks (current)`. */
  text: string;
  range: string;
  /** Optional explanation of what values/frequency count toward the streak. */
  qualifier?: string;
};

/**
 * Streak window grouped into display columns from oldest to newest.
 * Daily streak columns are calendar weeks containing Sunday through Saturday; the newest column
 * ends on the graph's final day and may contain fewer than seven days. Weekly streak periods use
 * one cell per column.
 */
export type StreakGraphData = {
  data: StreakDatum[][];
  /** Present when `streak.show_longest` is enabled and a longest run exists. */
  longestStreak?: LongestStreak;
};
