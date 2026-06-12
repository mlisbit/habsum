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

export type StreakDatum = {
  /** Day: logged option, or `null`. Week: progress label (e.g. `2/3`), or `null` if nothing logged. */
  value: string | null;
  /** Dot fill intensity from `0` to `10`. */
  fill: number;
  /** Week buckets: inclusive calendar range for this cell (e.g. `Mon, Jan 6 – Sun, Jan 12`). */
  label?: string;
};

/** Longest historical streak when YAML sets `streak.show_longest`. */
export type LongestStreak = {
  /** Display label for the longest streak row. */
  label: string;
  /** e.g. `3 days of good` or `2 weeks of 3+ per week: good (current)`. */
  text: string;
  range: string;
};

/** Streak window ending on the API view date. Keys are `YYYY-MM-DD` (day or week-start Monday). */
export type StreakGraphData = {
  data: Record<Day, StreakDatum>;
  /** Consecutive periods ending on the view date (e.g. `3 days` or `2 weeks`). */
  streakText: string;
  /** Present when `streak.show_longest` is enabled and a longest run exists. */
  longestStreak?: LongestStreak;
};
