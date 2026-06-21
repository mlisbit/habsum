import type { BarGraphData } from '@habsum/types/common/bar-chart';
import { dayFromString, type Day } from '@habsum/types/common/day';
import {
  isDailyStreakFrequency,
  parseStreakFrequencyDays,
  type LongestStreak,
  type StreakDatum,
  type StreakGraphData,
} from '@habsum/types/common/streak';
import type { Habit, HabitHistory, HabitWidget } from '@habsum/types/common/habit';
import { fromDateKey, toDateKey } from '@habsum/utils';
import type { HabitDef } from './config.js';
import {
  getAllSelects,
  getAllTotals,
  getSelect,
  getSeries,
  getSummationDayTotal,
  getSummationEvents,
} from './db.js';
import { habitApiTodayKey } from './server-time.js';
import { mapSummationEventsToApi } from './summation-event-api.js';

type StreakGraphWithText = StreakGraphData & {
  currentText: string;
};

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
        ...(habitDef.theme ? { theme: habitDef.theme } : {}),
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

/** Y-axis max for history bars: at least 1, the period max logged total, and the habit goal when set. */
export function historyGraphScaleTop(
  values: readonly number[],
  goal: number | null | undefined,
): number {
  const maxValue = values.length === 0 ? 0 : Math.max(...values);
  const goalFloor = goal != null && goal > 0 ? goal : 0;
  return Math.max(1, maxValue, goalFloor);
}

const GRAPH_RIGHT_PADDING_DAYS = 3;

function graphRightPaddingDays(viewDate: string, today: string): number {
  if (viewDate >= today) return 0;
  const diff = Math.round(
    (fromDateKey(today, 0).getTime() - fromDateKey(viewDate, 0).getTime()) / 86_400_000,
  );
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.min(GRAPH_RIGHT_PADDING_DAYS, diff);
}

function shouldOutlineViewDate(viewDate: string, today: string): boolean {
  return viewDate !== today;
}

/** Builds `HabitHistory` for the view date window (`period` from config, e.g. `1w` → 7 daily bars). */
export function habitHistoryForConfiguredPeriod(
  user: string,
  habitName: string,
  viewDate: string,
  firstDate: string | null,
  periodSpec: string,
  goal: number | null | undefined = null,
  at: Date = new Date(),
  tzOffsetMinutes?: number,
): HabitHistory {
  const days = parsePeriodDays(periodSpec) ?? 7;
  const today = habitApiTodayKey(at, tzOffsetMinutes);
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const end = addDaysUtc(viewDate, rightPaddingDays);
  const start = addDaysUtc(end, -(days - 1));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const rows = getSeries(user, habitName, start, end);
  const byDate = new Map(rows.map((r) => [r.date, r.total]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = addDaysUtc(start, i);
    if (firstDate && d < firstDate) return null;
    if (!byDate.has(d)) return null;
    return byDate.get(d)!;
  });
  const numericForTop = series.filter((v): v is number => v != null);
  const top = historyGraphScaleTop(numericForTop, goal);
  const graphData: BarGraphData = {};
  for (let i = 0; i < days; i++) {
    const d = addDaysUtc(start, i);
    graphData[d] = {
      value: series[i]!,
      top,
      hoverLabel: formatHistoryDayHoverLabel(d),
      ...(outlineViewDate && d === viewDate ? { outline: true } : {}),
      ...(outlineViewDate && d > viewDate ? { dimmed: true } : {}),
    };
  }
  return {
    data: { user: { graphData } },
  };
}

function historyAverage(history: HabitHistory, includeAbsentDays: boolean): number | null {
  const allValues = Object.values(history.data.user.graphData).map((datum) => datum.value);
  const values = includeAbsentDays
    ? allValues
    : allValues.filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return Math.round(values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / values.length);
}

function formatShortHistoryDate(dateKey: string): string {
  const [ys, ms, ds] = dateKey.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dateKey;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function historyAverageRangeText(history: HabitHistory): string {
  const entries = Object.entries(history.data.user.graphData);
  const first = entries.at(0)?.[0];
  if (first == null) return 'since now';
  const outlined = entries.find(([, datum]) => datum.outline === true)?.[0];
  if (outlined == null) return `since ${formatShortHistoryDate(first)}`;
  return `from ${formatShortHistoryDate(first)} to ${formatShortHistoryDate(outlined)}`;
}

function historyAverageHoverText(history: HabitHistory): string {
  const values = Object.values(history.data.user.graphData);
  const daysWithData = values.filter((datum) => datum.value != null).length;
  const daysWithoutData = values.length - daysWithData;
  return daysWithoutData === 0
    ? `Average includes all ${values.length} ${values.length === 1 ? 'day' : 'days'} in this history window.`
    : `Average excludes ${daysWithoutData} ${daysWithoutData === 1 ? 'day' : 'days'} with no data and uses ${daysWithData} ${daysWithData === 1 ? 'day' : 'days'} with logged data.`;
}

export function progressWidget(total: number | null, goal: number | null): HabitWidget | null {
  if (goal == null) {
    return {
      title: 'Progress',
      titleValue: total == null ? 'No data' : String(total),
      body: [],
    };
  }

  return {
    title: 'Goal',
    titleValue: `${total == null ? '—' : total} / ${goal}`,
    body: [{ kind: 'progress', value: total, max: goal }],
  };
}

export function historyWidget(
  history: HabitHistory,
  goal: number | null | undefined,
  includeAbsentDaysInAverage = false,
): HabitWidget {
  const average = historyAverage(history, includeAbsentDaysInAverage);
  const averageText = average == null ? '—' : String(average);
  return {
    title: 'History',
    titleValue: `${averageText}/day average ${historyAverageRangeText(history)}`,
    ...(!includeAbsentDaysInAverage
      ? { titleValueHoverText: historyAverageHoverText(history) }
      : {}),
    body: [
      {
        kind: 'barGraph',
        data: history.data.user.graphData,
        ...(goal != null && goal > 0
          ? { lines: [{ value: goal, label: `Daily goal: ${goal}` }] }
          : {}),
      },
    ],
  };
}

function streakGraphData(streak: StreakGraphWithText): StreakGraphData {
  const { currentText: _omit, ...graph } = streak;
  return graph;
}

export function streakWidget(streak: StreakGraphWithText): HabitWidget {
  return {
    title: 'Streak',
    body: [
      {
        kind: 'pills',
        pills: [
          { label: `Current streak: ${streak.currentText}` },
          ...(streak.longestStreak
            ? [
                {
                  label: `${streak.longestStreak.label}: ${streak.longestStreak.text}`,
                  hover: streak.longestStreak.range,
                },
              ]
            : []),
        ],
      },
      { kind: 'streakGraph', graph: streakGraphData(streak) },
    ],
  };
}

export function habitWidgets(widgets: Array<HabitWidget | null | undefined>): HabitWidget[] {
  return widgets.filter((widget): widget is HabitWidget => widget != null);
}

/** Window length returned for `single_select.streak.data` in `GET .../habits` (inclusive end = API view date). */
const STREAK_WINDOW_UNITS = 126;

/** Max days to scan backward when computing `current` (handles multi-year streaks without an unbounded loop). */
const MAX_STREAK_BACKTRACK_DAYS = 10 * 366;

function dayCountsTowardStreak(value: string | null, eligible: ReadonlySet<string>): boolean {
  return value != null && eligible.has(value);
}

function totalCountsTowardStreak(total: number | null, eligible: ReadonlySet<string>): boolean {
  if (total == null) return false;
  for (const option of eligible) {
    const goal = Number(option);
    if (Number.isFinite(goal) && total >= goal) return true;
  }
  return false;
}

export function formatSelectStreakText(current: number, weekly = false): string {
  if (weekly) {
    return current === 1 ? '1 week' : `${current} weeks`;
  }
  return current === 1 ? '1 day' : `${current} days`;
}

function weekStartMonday(dateKey: string): string {
  const dt = fromDateKey(dateKey, 0);
  const weekday = dt.getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  return addDaysUtc(dateKey, -daysFromMonday);
}

function formatWeekRangeLabel(weekStart: string, weekEnd: string): string {
  return `${formatHistoryDayHoverLabel(weekStart)} – ${formatHistoryDayHoverLabel(weekEnd)}`;
}

function countEligibleDaysInRange(
  user: string,
  habitName: string,
  start: string,
  end: string,
  eligible: ReadonlySet<string>,
): number {
  let count = 0;
  for (let d = start; d <= end; d = addDaysUtc(d, 1)) {
    if (dayCountsTowardStreak(getSelect(user, habitName, d), eligible)) count++;
  }
  return count;
}

function countLoggedDaysInRange(
  user: string,
  habitName: string,
  start: string,
  end: string,
): number {
  let count = 0;
  for (let d = start; d <= end; d = addDaysUtc(d, 1)) {
    if (getSelect(user, habitName, d) != null) count++;
  }
  return count;
}

function countEligibleSummationDaysInRange(
  user: string,
  habitName: string,
  start: string,
  end: string,
  eligible: ReadonlySet<string>,
): number {
  let count = 0;
  for (let d = start; d <= end; d = addDaysUtc(d, 1)) {
    if (totalCountsTowardStreak(getSummationDayTotal(user, habitName, d), eligible)) count++;
  }
  return count;
}

function countLoggedSummationDaysInRange(
  user: string,
  habitName: string,
  start: string,
  end: string,
): number {
  let count = 0;
  for (let d = start; d <= end; d = addDaysUtc(d, 1)) {
    if (getSummationDayTotal(user, habitName, d) != null) count++;
  }
  return count;
}

function dailyStreakFill(value: string | null, eligible: ReadonlySet<string>): number {
  if (value == null) return 0;
  return eligible.has(value) ? 10 : 1;
}

function dailySummationStreakFill(total: number | null, eligible: ReadonlySet<string>): number {
  if (total == null) return 0;
  return totalCountsTowardStreak(total, eligible) ? 10 : 1;
}

function weeklyStreakFill(hits: number, loggedDays: number, daysPerWeek: number): number {
  if (loggedDays === 0) return 0;
  if (hits >= daysPerWeek) return 10;
  if (hits === 0) return 1;
  return Math.max(1, Math.min(9, Math.round((hits / daysPerWeek) * 10)));
}

function weekMeetsFrequency(
  user: string,
  habitName: string,
  weekStart: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
): boolean {
  const weekEnd = addDaysUtc(weekStart, 6);
  return countEligibleDaysInRange(user, habitName, weekStart, weekEnd, eligible) >= daysPerWeek;
}

function summationWeekMeetsFrequency(
  user: string,
  habitName: string,
  weekStart: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
): boolean {
  const weekEnd = addDaysUtc(weekStart, 6);
  return (
    countEligibleSummationDaysInRange(user, habitName, weekStart, weekEnd, eligible) >= daysPerWeek
  );
}

function formatWeekProgressLabel(hits: number, daysPerWeek: number): string | null {
  if (hits <= 0) return null;
  return `${hits}/${daysPerWeek}`;
}

function formatDayRangeLabel(start: string, end: string): string {
  return `${formatHistoryDayHoverLabel(start)} – ${formatHistoryDayHoverLabel(end)}`;
}

type StreakRun = { length: number; start: string; end: string };

function finalizeLongestRun(current: StreakRun, best: StreakRun): StreakRun {
  return current.length > best.length ? { ...current } : best;
}

function earliestStreakScanDate(
  user: string,
  habitName: string,
  firstDate: string | null,
): string | null {
  if (firstDate) return firstDate;
  const rows = getAllSelects(user, habitName);
  if (rows.length === 0) return null;
  return rows.reduce((min, row) => (row.date < min ? row.date : min), rows[0]!.date);
}

function longestDailyStreakRun(
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  firstDate: string | null,
): StreakRun | null {
  const scanStart = earliestStreakScanDate(user, habitName, firstDate);
  if (scanStart == null || scanStart > viewDate) return null;

  let best: StreakRun = { length: 0, start: '', end: '' };
  let current: StreakRun = { length: 0, start: '', end: '' };

  for (let d = scanStart; d <= viewDate; d = addDaysUtc(d, 1)) {
    if (dayCountsTowardStreak(getSelect(user, habitName, d), eligible)) {
      if (current.length === 0) current.start = d;
      current.length++;
      current.end = d;
    } else if (current.length > 0) {
      best = finalizeLongestRun(current, best);
      current = { length: 0, start: '', end: '' };
    }
  }

  best = finalizeLongestRun(current, best);
  return best.length > 0 ? best : null;
}

function longestWeeklyStreakRun(
  user: string,
  habitName: string,
  viewDate: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  firstDate: string | null,
): StreakRun | null {
  const scanStart = earliestStreakScanDate(user, habitName, firstDate);
  if (scanStart == null || scanStart > viewDate) return null;

  const firstWeek = weekStartMonday(scanStart);
  const viewWeek = weekStartMonday(viewDate);
  let best: StreakRun = { length: 0, start: '', end: '' };
  let current: StreakRun = { length: 0, start: '', end: '' };

  for (let weekStart = firstWeek; weekStart <= viewWeek; weekStart = addDaysUtc(weekStart, 7)) {
    if (weekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible)) {
      const weekEnd = addDaysUtc(weekStart, 6);
      if (current.length === 0) {
        current.start = weekStart;
        current.end = weekEnd;
      } else {
        current.end = weekEnd;
      }
      current.length++;
    } else if (current.length > 0) {
      best = finalizeLongestRun(current, best);
      current = { length: 0, start: '', end: '' };
    }
  }

  best = finalizeLongestRun(current, best);
  return best.length > 0 ? best : null;
}

function longestDailySummationStreakRun(
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  firstDate: string | null,
): StreakRun | null {
  const scanStart = earliestStreakScanDate(user, habitName, firstDate);
  if (scanStart == null || scanStart > viewDate) return null;

  let best: StreakRun = { length: 0, start: '', end: '' };
  let current: StreakRun = { length: 0, start: '', end: '' };

  for (let d = scanStart; d <= viewDate; d = addDaysUtc(d, 1)) {
    if (totalCountsTowardStreak(getSummationDayTotal(user, habitName, d), eligible)) {
      if (current.length === 0) current.start = d;
      current.length++;
      current.end = d;
    } else if (current.length > 0) {
      best = finalizeLongestRun(current, best);
      current = { length: 0, start: '', end: '' };
    }
  }

  best = finalizeLongestRun(current, best);
  return best.length > 0 ? best : null;
}

function longestWeeklySummationStreakRun(
  user: string,
  habitName: string,
  viewDate: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  firstDate: string | null,
): StreakRun | null {
  const scanStart = earliestStreakScanDate(user, habitName, firstDate);
  if (scanStart == null || scanStart > viewDate) return null;

  const firstWeek = weekStartMonday(scanStart);
  const viewWeek = weekStartMonday(viewDate);
  let best: StreakRun = { length: 0, start: '', end: '' };
  let current: StreakRun = { length: 0, start: '', end: '' };

  for (let weekStart = firstWeek; weekStart <= viewWeek; weekStart = addDaysUtc(weekStart, 7)) {
    if (summationWeekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible)) {
      const weekEnd = addDaysUtc(weekStart, 6);
      if (current.length === 0) {
        current.start = weekStart;
        current.end = weekEnd;
      } else {
        current.end = weekEnd;
      }
      current.length++;
    } else if (current.length > 0) {
      best = finalizeLongestRun(current, best);
      current = { length: 0, start: '', end: '' };
    }
  }

  best = finalizeLongestRun(current, best);
  return best.length > 0 ? best : null;
}

function streakRunsEqual(a: StreakRun, b: StreakRun): boolean {
  return a.length === b.length && a.start === b.start && a.end === b.end;
}

function formatLongestStreakQualifier(eligible: ReadonlySet<string>, daysPerWeek: number): string {
  const options = [...eligible].join(', ');
  if (!options) return '';
  if (isDailyStreakFrequency(daysPerWeek)) return options;
  return `${daysPerWeek}+ per week: ${options}`;
}

/** Consecutive streak-eligible days ending on `viewDate` (may precede `STREAK_WINDOW_UNITS` chart window). */
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

function currentDailyStreakRun(
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
): StreakRun | null {
  const length = currentSelectStreakLength(user, habitName, viewDate, eligible, omitEmptyViewDate);
  if (length === 0) return null;

  let end = viewDate;
  if (omitEmptyViewDate && getSelect(user, habitName, end) == null) {
    end = addDaysUtc(end, -1);
  }
  return {
    length,
    start: addDaysUtc(end, -(length - 1)),
    end,
  };
}

function currentSelectStreakWeeks(
  user: string,
  habitName: string,
  viewDate: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
): number {
  let n = 0;
  let weekStart = weekStartMonday(viewDate);
  if (
    omitIncompleteViewWeek &&
    !weekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible)
  ) {
    weekStart = addDaysUtc(weekStart, -7);
  }
  for (
    let steps = 0;
    steps < MAX_STREAK_BACKTRACK_DAYS / 7;
    steps++, weekStart = addDaysUtc(weekStart, -7)
  ) {
    if (!weekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible)) break;
    n++;
  }
  return n;
}

function currentWeeklyStreakRun(
  user: string,
  habitName: string,
  viewDate: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
): StreakRun | null {
  const length = currentSelectStreakWeeks(
    user,
    habitName,
    viewDate,
    daysPerWeek,
    eligible,
    omitIncompleteViewWeek,
  );
  if (length === 0) return null;

  let endWeekStart = weekStartMonday(viewDate);
  if (
    omitIncompleteViewWeek &&
    !weekMeetsFrequency(user, habitName, endWeekStart, daysPerWeek, eligible)
  ) {
    endWeekStart = addDaysUtc(endWeekStart, -7);
  }

  const startWeekStart = addDaysUtc(endWeekStart, -(length - 1) * 7);
  return {
    length,
    start: startWeekStart,
    end: addDaysUtc(endWeekStart, 6),
  };
}

function currentSummationStreakLength(
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
): number {
  let n = 0;
  let d = viewDate;
  if (omitEmptyViewDate && getSummationDayTotal(user, habitName, d) == null) {
    d = addDaysUtc(d, -1);
  }
  for (let steps = 0; steps < MAX_STREAK_BACKTRACK_DAYS; steps++, d = addDaysUtc(d, -1)) {
    if (!totalCountsTowardStreak(getSummationDayTotal(user, habitName, d), eligible)) break;
    n++;
  }
  return n;
}

function currentDailySummationStreakRun(
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
): StreakRun | null {
  const length = currentSummationStreakLength(
    user,
    habitName,
    viewDate,
    eligible,
    omitEmptyViewDate,
  );
  if (length === 0) return null;

  let end = viewDate;
  if (omitEmptyViewDate && getSummationDayTotal(user, habitName, end) == null) {
    end = addDaysUtc(end, -1);
  }
  return {
    length,
    start: addDaysUtc(end, -(length - 1)),
    end,
  };
}

function currentSummationStreakWeeks(
  user: string,
  habitName: string,
  viewDate: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
): number {
  let n = 0;
  let weekStart = weekStartMonday(viewDate);
  if (
    omitIncompleteViewWeek &&
    !summationWeekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible)
  ) {
    weekStart = addDaysUtc(weekStart, -7);
  }
  for (
    let steps = 0;
    steps < MAX_STREAK_BACKTRACK_DAYS / 7;
    steps++, weekStart = addDaysUtc(weekStart, -7)
  ) {
    if (!summationWeekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible)) break;
    n++;
  }
  return n;
}

function currentWeeklySummationStreakRun(
  user: string,
  habitName: string,
  viewDate: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
): StreakRun | null {
  const length = currentSummationStreakWeeks(
    user,
    habitName,
    viewDate,
    daysPerWeek,
    eligible,
    omitIncompleteViewWeek,
  );
  if (length === 0) return null;

  let endWeekStart = weekStartMonday(viewDate);
  if (
    omitIncompleteViewWeek &&
    !summationWeekMeetsFrequency(user, habitName, endWeekStart, daysPerWeek, eligible)
  ) {
    endWeekStart = addDaysUtc(endWeekStart, -7);
  }

  const startWeekStart = addDaysUtc(endWeekStart, -(length - 1) * 7);
  return {
    length,
    start: startWeekStart,
    end: addDaysUtc(endWeekStart, 6),
  };
}

function longestStreakForConfig(
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  daysPerWeek: number,
  firstDate: string | null,
  omitEmptyViewPeriod: boolean,
): LongestStreak | undefined {
  const weekly = !isDailyStreakFrequency(daysPerWeek);
  const run = weekly
    ? longestWeeklyStreakRun(user, habitName, viewDate, daysPerWeek, eligible, firstDate)
    : longestDailyStreakRun(user, habitName, viewDate, eligible, firstDate);
  if (!run) return undefined;

  const activeRun = weekly
    ? currentWeeklyStreakRun(user, habitName, viewDate, daysPerWeek, eligible, omitEmptyViewPeriod)
    : currentDailyStreakRun(user, habitName, viewDate, eligible, omitEmptyViewPeriod);

  const range = weekly
    ? formatWeekRangeLabel(run.start, run.end)
    : formatDayRangeLabel(run.start, run.end);

  const isCurrent = activeRun != null && streakRunsEqual(run, activeRun);
  const text = formatSelectStreakText(run.length, weekly);
  const qualifier = formatLongestStreakQualifier(eligible, daysPerWeek);
  const qualifiedText = qualifier ? `${text} of ${qualifier}` : text;
  return {
    label: 'Longest streak',
    text: isCurrent ? `${qualifiedText} (current)` : qualifiedText,
    range,
  };
}

function longestSummationStreakForConfig(
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  daysPerWeek: number,
  firstDate: string | null,
  omitEmptyViewPeriod: boolean,
): LongestStreak | undefined {
  const weekly = !isDailyStreakFrequency(daysPerWeek);
  const run = weekly
    ? longestWeeklySummationStreakRun(user, habitName, viewDate, daysPerWeek, eligible, firstDate)
    : longestDailySummationStreakRun(user, habitName, viewDate, eligible, firstDate);
  if (!run) return undefined;

  const activeRun = weekly
    ? currentWeeklySummationStreakRun(
        user,
        habitName,
        viewDate,
        daysPerWeek,
        eligible,
        omitEmptyViewPeriod,
      )
    : currentDailySummationStreakRun(user, habitName, viewDate, eligible, omitEmptyViewPeriod);

  const range = weekly
    ? formatWeekRangeLabel(run.start, run.end)
    : formatDayRangeLabel(run.start, run.end);

  const isCurrent = activeRun != null && streakRunsEqual(run, activeRun);
  const text = formatSelectStreakText(run.length, weekly);
  const qualifier = formatLongestStreakQualifier(eligible, daysPerWeek);
  const qualifiedText = qualifier ? `${text} of ${qualifier}` : text;
  return {
    label: 'Longest streak',
    text: isCurrent ? `${qualifiedText} (current)` : qualifiedText,
    range,
  };
}

function attachLongestStreak(
  graph: StreakGraphWithText,
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  daysPerWeek: number,
  showLongest: boolean,
  firstDate: string | null,
  omitEmptyViewPeriod: boolean,
): StreakGraphWithText {
  if (!showLongest) return graph;
  const longestStreak = longestStreakForConfig(
    user,
    habitName,
    viewDate,
    eligible,
    daysPerWeek,
    firstDate,
    omitEmptyViewPeriod,
  );
  if (!longestStreak) return graph;
  return { ...graph, longestStreak };
}

function attachLongestSummationStreak(
  graph: StreakGraphWithText,
  user: string,
  habitName: string,
  viewDate: string,
  eligible: ReadonlySet<string>,
  daysPerWeek: number,
  showLongest: boolean,
  firstDate: string | null,
  omitEmptyViewPeriod: boolean,
): StreakGraphWithText {
  if (!showLongest) return graph;
  const longestStreak = longestSummationStreakForConfig(
    user,
    habitName,
    viewDate,
    eligible,
    daysPerWeek,
    firstDate,
    omitEmptyViewPeriod,
  );
  if (!longestStreak) return graph;
  return { ...graph, longestStreak };
}

function streakGraphDailyWindow(
  user: string,
  habitName: string,
  viewDate: string,
  today: string,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
): StreakGraphWithText {
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const end = addDaysUtc(viewDate, rightPaddingDays);
  const start = addDaysUtc(end, -(STREAK_WINDOW_UNITS - 1));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const data = {} as Record<Day, StreakDatum>;
  for (let i = 0; i < STREAK_WINDOW_UNITS; i++) {
    const d = addDaysUtc(start, i);
    const value = getSelect(user, habitName, d);
    data[dayFromString(d)] = {
      value,
      fill: dailyStreakFill(value, eligible),
      ...(outlineViewDate && d === viewDate ? { outline: true } : {}),
      ...(outlineViewDate && d > viewDate ? { dimmed: true } : {}),
    };
  }
  const current = currentSelectStreakLength(user, habitName, viewDate, eligible, omitEmptyViewDate);
  return {
    data,
    currentText: formatSelectStreakText(current),
  };
}

function streakGraphWeeklyWindow(
  user: string,
  habitName: string,
  viewDate: string,
  today: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
): StreakGraphWithText {
  const viewWeekStart = weekStartMonday(viewDate);
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const endWeekStart = weekStartMonday(addDaysUtc(viewDate, rightPaddingDays));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const data = {} as Record<Day, StreakDatum>;
  for (let i = STREAK_WINDOW_UNITS - 1; i >= 0; i--) {
    const weekStart = addDaysUtc(endWeekStart, -i * 7);
    const weekEnd = addDaysUtc(weekStart, 6);
    const hits = countEligibleDaysInRange(user, habitName, weekStart, weekEnd, eligible);
    const loggedDays = countLoggedDaysInRange(user, habitName, weekStart, weekEnd);
    data[dayFromString(weekStart)] = {
      value: formatWeekProgressLabel(hits, daysPerWeek),
      fill: weeklyStreakFill(hits, loggedDays, daysPerWeek),
      label: formatWeekRangeLabel(weekStart, weekEnd),
      ...(outlineViewDate && weekStart === viewWeekStart ? { outline: true } : {}),
      ...(outlineViewDate && weekStart > viewWeekStart ? { dimmed: true } : {}),
    };
  }
  const current = currentSelectStreakWeeks(
    user,
    habitName,
    viewDate,
    daysPerWeek,
    eligible,
    omitIncompleteViewWeek,
  );
  return {
    data,
    currentText: formatSelectStreakText(current, true),
  };
}

function summationStreakGraphDailyWindow(
  user: string,
  habitName: string,
  viewDate: string,
  today: string,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
): StreakGraphWithText {
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const end = addDaysUtc(viewDate, rightPaddingDays);
  const start = addDaysUtc(end, -(STREAK_WINDOW_UNITS - 1));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const data = {} as Record<Day, StreakDatum>;
  for (let i = 0; i < STREAK_WINDOW_UNITS; i++) {
    const d = addDaysUtc(start, i);
    const total = getSummationDayTotal(user, habitName, d);
    data[dayFromString(d)] = {
      value: total == null ? null : String(total),
      fill: dailySummationStreakFill(total, eligible),
      ...(outlineViewDate && d === viewDate ? { outline: true } : {}),
      ...(outlineViewDate && d > viewDate ? { dimmed: true } : {}),
    };
  }
  const current = currentSummationStreakLength(
    user,
    habitName,
    viewDate,
    eligible,
    omitEmptyViewDate,
  );
  return {
    data,
    currentText: formatSelectStreakText(current),
  };
}

function summationStreakGraphWeeklyWindow(
  user: string,
  habitName: string,
  viewDate: string,
  today: string,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
): StreakGraphWithText {
  const viewWeekStart = weekStartMonday(viewDate);
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const endWeekStart = weekStartMonday(addDaysUtc(viewDate, rightPaddingDays));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const data = {} as Record<Day, StreakDatum>;
  for (let i = STREAK_WINDOW_UNITS - 1; i >= 0; i--) {
    const weekStart = addDaysUtc(endWeekStart, -i * 7);
    const weekEnd = addDaysUtc(weekStart, 6);
    const hits = countEligibleSummationDaysInRange(user, habitName, weekStart, weekEnd, eligible);
    const loggedDays = countLoggedSummationDaysInRange(user, habitName, weekStart, weekEnd);
    data[dayFromString(weekStart)] = {
      value: formatWeekProgressLabel(hits, daysPerWeek),
      fill: weeklyStreakFill(hits, loggedDays, daysPerWeek),
      label: formatWeekRangeLabel(weekStart, weekEnd),
      ...(outlineViewDate && weekStart === viewWeekStart ? { outline: true } : {}),
      ...(outlineViewDate && weekStart > viewWeekStart ? { dimmed: true } : {}),
    };
  }
  const current = currentSummationStreakWeeks(
    user,
    habitName,
    viewDate,
    daysPerWeek,
    eligible,
    omitIncompleteViewWeek,
  );
  return {
    data,
    currentText: formatSelectStreakText(current, true),
  };
}

export function streakGraphForConfiguredWindow(
  user: string,
  habitName: string,
  viewDate: string,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  tzOffsetMinutes?: number,
  streakFrequency?: string,
  showLongest = false,
  firstDate: string | null = null,
): StreakGraphWithText {
  const eligible = new Set(streakEligibleOptions);
  const today = habitApiTodayKey(at, tzOffsetMinutes);
  const omitEmptyViewPeriod = viewDate === today;
  const daysPerWeek = parseStreakFrequencyDays(streakFrequency);
  const graph = isDailyStreakFrequency(daysPerWeek)
    ? streakGraphDailyWindow(user, habitName, viewDate, today, eligible, omitEmptyViewPeriod)
    : streakGraphWeeklyWindow(
        user,
        habitName,
        viewDate,
        today,
        daysPerWeek,
        eligible,
        omitEmptyViewPeriod,
      );
  return attachLongestStreak(
    graph,
    user,
    habitName,
    viewDate,
    eligible,
    daysPerWeek,
    showLongest,
    firstDate,
    omitEmptyViewPeriod,
  );
}

export function summationStreakGraphForConfiguredWindow(
  user: string,
  habitName: string,
  viewDate: string,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  tzOffsetMinutes?: number,
  streakFrequency?: string,
  showLongest = false,
  firstDate: string | null = null,
): StreakGraphWithText {
  const eligible = new Set(streakEligibleOptions);
  const today = habitApiTodayKey(at, tzOffsetMinutes);
  const omitEmptyViewPeriod = viewDate === today;
  const daysPerWeek = parseStreakFrequencyDays(streakFrequency);
  const graph = isDailyStreakFrequency(daysPerWeek)
    ? summationStreakGraphDailyWindow(
        user,
        habitName,
        viewDate,
        today,
        eligible,
        omitEmptyViewPeriod,
      )
    : summationStreakGraphWeeklyWindow(
        user,
        habitName,
        viewDate,
        today,
        daysPerWeek,
        eligible,
        omitEmptyViewPeriod,
      );
  return attachLongestSummationStreak(
    graph,
    user,
    habitName,
    viewDate,
    eligible,
    daysPerWeek,
    showLongest,
    firstDate,
    omitEmptyViewPeriod,
  );
}
