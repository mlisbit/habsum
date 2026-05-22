import type { BarGraphData } from '@habsum/types/common/bar-chart';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
import type { Habit, HabitHistory } from '@habsum/types/common/habit';
import { fromDateKey, toDateKey } from '@habsum/utils';
import type { HabitDef } from './config.js';
import { getAllSelects, getAllTotals, getSelect, getSeries, getSummationEvents } from './db.js';
import { habitApiTodayKey } from './server-time.js';
import { mapSummationEventsToApi } from './summation-event-api.js';

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

export function parseHabitFilter(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const seen = new Set<string>();
  return value
    .split(',')
    .map((x) => x.trim())
    .filter((x) => {
      if (!x || seen.has(x)) return false;
      seen.add(x);
      return true;
    });
}

export function minDate(dates: Array<string | null>): string | null {
  return dates.reduce<string | null>((min, date) => {
    if (date == null) return min;
    return min == null || date < min ? date : min;
  }, null);
}

export function habitRowsForHistory(
  user: string,
  habitDef: HabitDef,
): Array<{ day: string; habit: Habit }> {
  if (habitDef.type === 'single_select') {
    return getAllSelects(user, habitDef.name).map((r) => ({
      day: r.date,
      habit: {
        name: habitDef.name,
        type: 'single_select',
        goal: habitDef.goal,
        options: habitDef.options ?? [],
        value: r.value,
      } satisfies Habit,
    }));
  }

  return getAllTotals(user, habitDef.name).map((r) => {
    const events = mapSummationEventsToApi(getSummationEvents(user, habitDef.name, r.date));
    return {
      day: r.date,
      habit: {
        name: habitDef.name,
        type: 'summation',
        goal: habitDef.goal ?? null,
        total: r.total,
        events,
        ...(habitDef.summationOptions ? { summationOptions: habitDef.summationOptions } : {}),
      } satisfies Habit,
    };
  });
}

export function emptyHabitForHistory(habitDef: HabitDef): Habit {
  if (habitDef.type === 'single_select') {
    return {
      name: habitDef.name,
      type: 'single_select',
      goal: habitDef.goal,
      options: habitDef.options ?? [],
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

function addDaysUtc(date: string, delta: number) {
  const dt = fromDateKey(date, 0);
  const next = new Date(dt.getTime() + delta * 86_400_000);
  return toDateKey(next, 0);
}

function parsePeriodDays(period: string): number | null {
  const m = period.match(/^(\d+)([dw])$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2];
  return unit === 'w' ? n * 7 : n;
}

function formatHistoryDayHoverLabel(dateKey: string): string {
  const [ys, ms, ds] = dateKey.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dateKey;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Builds `HabitHistory` for the view date window (`period` from config, e.g. `1w` → 7 daily bars). */
export function habitHistoryForConfiguredPeriod(
  user: string,
  habitName: string,
  viewDate: string,
  firstDate: string | null,
  periodSpec: string,
): HabitHistory {
  const days = parsePeriodDays(periodSpec) ?? 7;
  const start = addDaysUtc(viewDate, -(days - 1));
  const rows = getSeries(user, habitName, start, viewDate);
  const byDate = new Map(rows.map((r) => [r.date, r.total]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = addDaysUtc(start, i);
    if (firstDate && d < firstDate) return null;
    if (!byDate.has(d)) return null;
    return byDate.get(d)!;
  });
  const numericForTop = series.filter((v): v is number => v != null);
  const top = numericForTop.length === 0 ? 1 : Math.max(1, ...numericForTop);
  const graphData: BarGraphData = {};
  for (let i = 0; i < days; i++) {
    const d = addDaysUtc(start, i);
    graphData[d] = {
      value: series[i]!,
      top,
      hoverLabel: formatHistoryDayHoverLabel(d),
    };
  }
  return {
    data: { user: { graphData } },
  };
}

/** Optional history snapshot for summation PATCH responses (matches GET habits). */
export function habitHistoryIfConfigured(
  user: string,
  habitDef: HabitDef,
  viewDate: string,
  firstDate: string | null,
): { history: HabitHistory } | Record<string, never> {
  if (!habitDef.history) return {};
  return {
    history: habitHistoryForConfiguredPeriod(
      user,
      habitDef.name,
      viewDate,
      firstDate,
      habitDef.history.period,
    ),
  };
}

/** Window length returned for `single_select.streak.data` in `GET .../habits` (inclusive end = API view date). */
const MIN_STREAK_DAYS = 7;

/** Max days to scan backward when computing `current` (handles multi-year streaks without an unbounded loop). */
const MAX_STREAK_BACKTRACK_DAYS = 10 * 366;

function dayCountsTowardStreak(value: string | null, eligible: ReadonlySet<string>): boolean {
  return value != null && eligible.has(value);
}

export function formatSelectStreakText(current: number): string {
  return current === 1 ? '1 day' : `${current} days`;
}

/** Consecutive streak-eligible days ending on `viewDate` (may precede `MIN_STREAK_DAYS` chart window). */
function currentSelectStreakLength(
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
): number {
  let n = 0;
  let d = viewDate;
  if (omitEmptyViewDate && getSelect(user, habitName, d) == null) {
    d = addDaysUtc(d, -1);
  }
  for (let steps = 0; steps < MAX_STREAK_BACKTRACK_DAYS; steps++, d = addDaysUtc(d, -1)) {
    const value = getSelect(user, habitName, d);
    if (!dayCountsTowardStreak(value, eligible)) break;
    n++;
  }
  return n;
}

export function streakGraphForConfiguredWindow(
  user: string,
  habitName: string,
  viewDate: string,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  tzOffsetMinutes?: number,
): StreakGraphData {
  const eligible = new Set(streakEligibleOptions);
  const omitEmptyViewDate = viewDate === habitApiTodayKey(at, tzOffsetMinutes);
  const start = addDaysUtc(viewDate, -(MIN_STREAK_DAYS - 1));
  const data = {} as Record<Day, StreakDatum>;
  for (let i = 0; i < MIN_STREAK_DAYS; i++) {
    const d = addDaysUtc(start, i);
    const value = getSelect(user, habitName, d);
    data[dayFromString(d)] = {
      value,
      include: value != null ? eligible.has(value) : null,
    };
  }
  const current = currentSelectStreakLength(user, habitName, viewDate, eligible, omitEmptyViewDate);
  return {
    data,
    streakText: formatSelectStreakText(current),
  };
}
