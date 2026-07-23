// Request parsing and date helpers used only by HabitService and its route.
import type { Day } from '@habsum/types/common/day';

export type PatchBody = {
  habit?: unknown;
  total?: unknown;
  action?: unknown;
  value?: unknown;
  date?: unknown;
  clientCreatedAt?: unknown;
  eventId?: unknown;
  tzOffsetMinutes?: unknown;
};

/** Parses a comma-separated list of dashed habit IDs, trimming and deduplicating entries. */
export function parseHabitFilter(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const seen = new Set<string>();
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

/** Returns the earliest branded `YYYY-MM-DD` value, ignoring null entries. */
export function minDate(dates: Array<Day | null>): Day | null {
  return dates.reduce<Day | null>((min, date) => {
    if (date == null) return min;
    return min == null || date < min ? date : min;
  }, null);
}
