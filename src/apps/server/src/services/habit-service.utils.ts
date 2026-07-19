// Request parsing and history-row helpers used only by HabitService and its route.
import type { Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import type { HabitDef } from '../types/userConfig.js';

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

/** Creates the empty API history row for a configured habit with no data on a day. */
export function emptyHabitForHistory(habitDef: HabitDef): Habit {
  if (habitDef.type === 'single_select') {
    return {
      name: habitDef.name,
      type: 'single_select',
      goal: habitDef.goal,
      options: habitDef.options ?? [],
      ...(habitDef.theme ? { theme: habitDef.theme } : {}),
      value: null,
    } satisfies Habit;
  }

  return {
    name: habitDef.name,
    type: 'summation',
    goal: habitDef.goal ?? null,
    total: null,
    events: [],
    ...(habitDef.summationOptions ? { summationOptions: habitDef.summationOptions } : {}),
  } satisfies Habit;
}
