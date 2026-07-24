// Streak calculations and heatmap graph construction from hydrated data readers.
import type { Day } from '@habsum/types/common/day';
import {
  isDailyStreakFrequency,
  parseStreakFrequencyDays,
  type LongestStreak,
  type StreakDatum,
  type StreakGraphData,
} from '@habsum/types/common/streak';
import { fromDateKey } from '@habsum/utils/date';
import { getHabitApiToday } from '../server-time-utils.js';
import type { HabitDataReader } from '../../types/habit.types.js';
import { fillDistribution } from './fill-distribution.js';
import { selectablePillToInt } from './selectable-pill-to-int.js';
import {
  addDaysUtc,
  formatHistoryDayHoverLabel,
  graphRightPaddingDays,
  shouldOutlineViewDate,
} from './date-utils.js';

export type StreakGraphWithText = StreakGraphData & {
  currentText: string;
};

const WEEKDAY_ROW_COUNT = 7;

/** Ensures streak builders received a reader backed by hydrated habit data. */
function requireHabitDataReader(reader: HabitDataReader | undefined): HabitDataReader {
  if (!reader) throw new Error('habit presentation requires hydrated habit data');
  return reader;
}

/** Reads a single-select value for one branded calendar day. */
function readerGetSelect(
  reader: HabitDataReader,
  user: string,
  habitName: string,
  date: Day,
): string | null {
  return reader.getSelect(user, habitName, date);
}

/** Reads a summation total for one branded calendar day. */
function readerGetSummationDayTotal(
  reader: HabitDataReader,
  user: string,
  habitName: string,
  date: Day,
): number | null {
  return reader.getSeries(user, habitName, date, date)[0]?.total ?? null;
}

/** Returns the UTC weekday index used by Sunday-first heatmap rows. */
function weekdayRowIndex(date: Day): number {
  return fromDateKey(date, 0).getUTCDay();
}

/** Returns the Sunday beginning the heatmap week containing `date`. */
function weekStartSunday(date: Day): Day {
  return addDaysUtc(date, -weekdayRowIndex(date));
}

/** Creates an empty column collection for a streak heatmap. */
function emptyStreakColumns(): StreakDatum[][] {
  return [];
}

/** Adds a daily datum to its Sunday-through-Saturday heatmap column. */
function addDailyStreakDatum(columns: StreakDatum[][], datum: StreakDatum): void {
  const currentColumn = columns.at(-1);
  const currentWeekStart = currentColumn?.[0] ? weekStartSunday(currentColumn[0].date) : null;
  const datumWeekStart = weekStartSunday(datum.date);
  if (!currentColumn || currentWeekStart !== datumWeekStart) {
    columns.push([datum]);
    return;
  }
  currentColumn.push(datum);
}

/** Adds a weekly datum as its own heatmap column. */
function addWeeklyStreakDatum(columns: StreakDatum[][], datum: StreakDatum): void {
  columns.push([datum]);
}

/** Normalizes raw success values into the signed heatmap fill scale. */
function applyStreakFillDistribution(
  columns: StreakDatum[][],
  values: ReadonlyArray<number | undefined>,
): void {
  const fills = fillDistribution(values);
  columns.flat().forEach((datum, index) => {
    const fill = fills[index];
    if (fill !== undefined) datum.fill = fill;
  });
}

/** Daily streak heatmaps show a contribution-calendar year: 53 Sunday-Saturday columns. */
const DAILY_STREAK_WINDOW_DAYS = 53 * 7;

/** Weekly streak heatmaps retain the previous number of week buckets. */
const WEEKLY_STREAK_WINDOW_WEEKS = 126;

/** Max days to scan backward when computing `current` (handles multi-year streaks without an unbounded loop). */
const MAX_STREAK_BACKTRACK_DAYS = 10 * 366;

/** Returns whether a selected option counts toward the configured streak. */
function dayCountsTowardStreak(value: string | null, eligible: ReadonlySet<string>): boolean {
  return value != null && eligible.has(value);
}

/** Returns whether a summation total reaches any configured numeric streak threshold. */
function totalCountsTowardStreak(total: number | null, eligible: ReadonlySet<string>): boolean {
  if (total == null) return false;
  for (const option of eligible) {
    const goal = Number(option);
    if (Number.isFinite(goal) && total >= goal) return true;
  }
  return false;
}

/** Formats a streak length as a singular or plural day/week label. */
export function formatSelectStreakText(current: number, weekly = false): string {
  if (weekly) {
    return current === 1 ? '1 week' : `${current} weeks`;
  }
  return current === 1 ? '1 day' : `${current} days`;
}

/** Returns the Monday beginning the streak week containing `dateKey`. */
function weekStartMonday(dateKey: Day): Day {
  const dt = fromDateKey(dateKey, 0);
  const weekday = dt.getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  return addDaysUtc(dateKey, -daysFromMonday);
}

/** Formats an inclusive branded week range for display. */
function formatWeekRangeLabel(weekStart: Day, weekEnd: Day): string {
  return `${formatHistoryDayHoverLabel(weekStart)} – ${formatHistoryDayHoverLabel(weekEnd)}`;
}

/** Counts streak-eligible single-select days in an inclusive range. */
function countEligibleDaysInRange(
  user: string,
  habitName: string,
  start: Day,
  end: Day,
  eligible: ReadonlySet<string>,
  reader: HabitDataReader,
): number {
  let count = 0;
  for (let d = start; d <= end; d = addDaysUtc(d, 1)) {
    if (dayCountsTowardStreak(readerGetSelect(reader, user, habitName, d), eligible)) count++;
  }
  return count;
}

/** Counts all logged single-select days in an inclusive range. */
function countLoggedDaysInRange(
  user: string,
  habitName: string,
  start: Day,
  end: Day,
  reader: HabitDataReader,
): number {
  let count = 0;
  for (let d = start; d <= end; d = addDaysUtc(d, 1)) {
    if (readerGetSelect(reader, user, habitName, d) != null) count++;
  }
  return count;
}

/** Counts streak-eligible summation days in an inclusive range. */
function countEligibleSummationDaysInRange(
  user: string,
  habitName: string,
  start: Day,
  end: Day,
  eligible: ReadonlySet<string>,
  reader: HabitDataReader,
): number {
  let count = 0;
  for (let d = start; d <= end; d = addDaysUtc(d, 1)) {
    if (totalCountsTowardStreak(readerGetSummationDayTotal(reader, user, habitName, d), eligible))
      count++;
  }
  return count;
}

/** Counts all logged summation days in an inclusive range. */
function countLoggedSummationDaysInRange(
  user: string,
  habitName: string,
  start: Day,
  end: Day,
  reader: HabitDataReader,
): number {
  let count = 0;
  for (let d = start; d <= end; d = addDaysUtc(d, 1)) {
    if (readerGetSummationDayTotal(reader, user, habitName, d) != null) count++;
  }
  return count;
}

/** Tests whether a single-select week reaches its required eligible-day frequency. */
function weekMeetsFrequency(
  user: string,
  habitName: string,
  weekStart: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  reader: HabitDataReader,
): boolean {
  const weekEnd = addDaysUtc(weekStart, 6);
  return (
    countEligibleDaysInRange(user, habitName, weekStart, weekEnd, eligible, reader) >= daysPerWeek
  );
}

/** Tests whether a summation week reaches its required eligible-day frequency. */
function summationWeekMeetsFrequency(
  user: string,
  habitName: string,
  weekStart: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  reader: HabitDataReader,
): boolean {
  const weekEnd = addDaysUtc(weekStart, 6);
  return (
    countEligibleSummationDaysInRange(user, habitName, weekStart, weekEnd, eligible, reader) >=
    daysPerWeek
  );
}

/** Formats weekly progress as `hits/required`, or null when nothing qualified. */
function formatWeekProgressLabel(hits: number, daysPerWeek: number): string | null {
  if (hits <= 0) return null;
  return `${hits}/${daysPerWeek}`;
}

/** Formats an inclusive branded day range for display. */
function formatDayRangeLabel(start: Day, end: Day): string {
  return `${formatHistoryDayHoverLabel(start)} – ${formatHistoryDayHoverLabel(end)}`;
}

type StreakRun = { length: number; start: Day; end: Day };

/** Keeps whichever completed streak run is longer. */
function finalizeLongestRun(current: StreakRun, best: StreakRun): StreakRun {
  return current.length > best.length ? { ...current } : best;
}

/** Resolves the first branded day available for a select-streak history scan. */
function earliestStreakScanDate(
  user: string,
  habitName: string,
  firstDate: Day | null,
  reader: HabitDataReader,
): Day | null {
  if (firstDate) return firstDate;
  return reader.getFirstSelectDate(user, habitName);
}

/** Finds the longest qualifying daily single-select streak through `viewDate`. */
function longestDailyStreakRun(
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  firstDate: Day | null,
  reader: HabitDataReader,
): StreakRun | null {
  const scanStart = earliestStreakScanDate(user, habitName, firstDate, reader);
  if (scanStart == null || scanStart > viewDate) return null;

  let best: StreakRun = { length: 0, start: scanStart, end: scanStart };
  let current: StreakRun = { length: 0, start: scanStart, end: scanStart };

  for (let d = scanStart; d <= viewDate; d = addDaysUtc(d, 1)) {
    if (dayCountsTowardStreak(readerGetSelect(reader, user, habitName, d), eligible)) {
      if (current.length === 0) current.start = d;
      current.length++;
      current.end = d;
    } else if (current.length > 0) {
      best = finalizeLongestRun(current, best);
      current = { length: 0, start: d, end: d };
    }
  }

  best = finalizeLongestRun(current, best);
  return best.length > 0 ? best : null;
}

/** Finds the longest qualifying weekly single-select streak through `viewDate`. */
function longestWeeklyStreakRun(
  user: string,
  habitName: string,
  viewDate: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  firstDate: Day | null,
  reader: HabitDataReader,
): StreakRun | null {
  const scanStart = firstDate;
  if (scanStart == null || scanStart > viewDate) return null;

  const firstWeek = weekStartMonday(scanStart);
  const viewWeek = weekStartMonday(viewDate);
  let best: StreakRun = { length: 0, start: firstWeek, end: firstWeek };
  let current: StreakRun = { length: 0, start: firstWeek, end: firstWeek };

  for (let weekStart = firstWeek; weekStart <= viewWeek; weekStart = addDaysUtc(weekStart, 7)) {
    if (weekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible, reader)) {
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
      current = { length: 0, start: weekStart, end: weekStart };
    }
  }

  best = finalizeLongestRun(current, best);
  return best.length > 0 ? best : null;
}

/** Finds the longest qualifying daily summation streak through `viewDate`. */
function longestDailySummationStreakRun(
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  firstDate: Day | null,
  reader: HabitDataReader,
): StreakRun | null {
  const scanStart = firstDate;
  if (scanStart == null || scanStart > viewDate) return null;

  let best: StreakRun = { length: 0, start: scanStart, end: scanStart };
  let current: StreakRun = { length: 0, start: scanStart, end: scanStart };

  for (let d = scanStart; d <= viewDate; d = addDaysUtc(d, 1)) {
    if (totalCountsTowardStreak(readerGetSummationDayTotal(reader, user, habitName, d), eligible)) {
      if (current.length === 0) current.start = d;
      current.length++;
      current.end = d;
    } else if (current.length > 0) {
      best = finalizeLongestRun(current, best);
      current = { length: 0, start: d, end: d };
    }
  }

  best = finalizeLongestRun(current, best);
  return best.length > 0 ? best : null;
}

/** Finds the longest qualifying weekly summation streak through `viewDate`. */
function longestWeeklySummationStreakRun(
  user: string,
  habitName: string,
  viewDate: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  firstDate: Day | null,
  reader: HabitDataReader,
): StreakRun | null {
  const scanStart = firstDate;
  if (scanStart == null || scanStart > viewDate) return null;

  const firstWeek = weekStartMonday(scanStart);
  const viewWeek = weekStartMonday(viewDate);
  let best: StreakRun = { length: 0, start: firstWeek, end: firstWeek };
  let current: StreakRun = { length: 0, start: firstWeek, end: firstWeek };

  for (let weekStart = firstWeek; weekStart <= viewWeek; weekStart = addDaysUtc(weekStart, 7)) {
    if (summationWeekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible, reader)) {
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
      current = { length: 0, start: weekStart, end: weekStart };
    }
  }

  best = finalizeLongestRun(current, best);
  return best.length > 0 ? best : null;
}

/** Compares two streak runs by length and inclusive date range. */
function streakRunsEqual(a: StreakRun, b: StreakRun): boolean {
  return a.length === b.length && a.start === b.start && a.end === b.end;
}

/** Describes the option values and optional weekly frequency that qualify a streak. */
function formatLongestStreakQualifier(eligible: ReadonlySet<string>, daysPerWeek: number): string {
  const options = [...eligible].join(', ');
  if (!options) return '';
  if (isDailyStreakFrequency(daysPerWeek)) return options;
  return `${daysPerWeek}+ per week: ${options}`;
}

/** Consecutive streak-eligible days ending on `viewDate` (may precede the chart window). */
function currentSelectStreakLength(
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
  reader: HabitDataReader,
): number {
  let n = 0;
  let d = viewDate;
  if (omitEmptyViewDate && readerGetSelect(reader, user, habitName, d) == null) {
    d = addDaysUtc(d, -1);
  }
  for (let steps = 0; steps < MAX_STREAK_BACKTRACK_DAYS; steps++, d = addDaysUtc(d, -1)) {
    const value = readerGetSelect(reader, user, habitName, d);
    if (!dayCountsTowardStreak(value, eligible)) break;
    n++;
  }
  return n;
}

/** Returns the active daily single-select streak and its inclusive branded range. */
function currentDailyStreakRun(
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
  reader: HabitDataReader,
): StreakRun | null {
  const length = currentSelectStreakLength(
    user,
    habitName,
    viewDate,
    eligible,
    omitEmptyViewDate,
    reader,
  );
  if (length === 0) return null;

  let end = viewDate;
  if (omitEmptyViewDate && readerGetSelect(reader, user, habitName, end) == null) {
    end = addDaysUtc(end, -1);
  }
  return {
    length,
    start: addDaysUtc(end, -(length - 1)),
    end,
  };
}

/** Counts consecutive qualifying single-select weeks ending near `viewDate`. */
function currentSelectStreakWeeks(
  user: string,
  habitName: string,
  viewDate: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
  reader: HabitDataReader,
): number {
  let n = 0;
  let weekStart = weekStartMonday(viewDate);
  if (
    omitIncompleteViewWeek &&
    !weekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible, reader)
  ) {
    weekStart = addDaysUtc(weekStart, -7);
  }
  for (
    let steps = 0;
    steps < MAX_STREAK_BACKTRACK_DAYS / 7;
    steps++, weekStart = addDaysUtc(weekStart, -7)
  ) {
    if (!weekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible, reader)) break;
    n++;
  }
  return n;
}

/** Returns the active weekly single-select streak and its inclusive branded range. */
function currentWeeklyStreakRun(
  user: string,
  habitName: string,
  viewDate: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
  reader: HabitDataReader,
): StreakRun | null {
  const length = currentSelectStreakWeeks(
    user,
    habitName,
    viewDate,
    daysPerWeek,
    eligible,
    omitIncompleteViewWeek,
    reader,
  );
  if (length === 0) return null;

  let endWeekStart = weekStartMonday(viewDate);
  if (
    omitIncompleteViewWeek &&
    !weekMeetsFrequency(user, habitName, endWeekStart, daysPerWeek, eligible, reader)
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

/** Counts consecutive qualifying summation days ending near `viewDate`. */
function currentSummationStreakLength(
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
  reader: HabitDataReader,
): number {
  let n = 0;
  let d = viewDate;
  if (omitEmptyViewDate && readerGetSummationDayTotal(reader, user, habitName, d) == null) {
    d = addDaysUtc(d, -1);
  }
  for (let steps = 0; steps < MAX_STREAK_BACKTRACK_DAYS; steps++, d = addDaysUtc(d, -1)) {
    if (!totalCountsTowardStreak(readerGetSummationDayTotal(reader, user, habitName, d), eligible))
      break;
    n++;
  }
  return n;
}

/** Returns the active daily summation streak and its inclusive branded range. */
function currentDailySummationStreakRun(
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
  reader: HabitDataReader,
): StreakRun | null {
  const length = currentSummationStreakLength(
    user,
    habitName,
    viewDate,
    eligible,
    omitEmptyViewDate,
    reader,
  );
  if (length === 0) return null;

  let end = viewDate;
  if (omitEmptyViewDate && readerGetSummationDayTotal(reader, user, habitName, end) == null) {
    end = addDaysUtc(end, -1);
  }
  return {
    length,
    start: addDaysUtc(end, -(length - 1)),
    end,
  };
}

/** Counts consecutive qualifying summation weeks ending near `viewDate`. */
function currentSummationStreakWeeks(
  user: string,
  habitName: string,
  viewDate: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
  reader: HabitDataReader,
): number {
  let n = 0;
  let weekStart = weekStartMonday(viewDate);
  if (
    omitIncompleteViewWeek &&
    !summationWeekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible, reader)
  ) {
    weekStart = addDaysUtc(weekStart, -7);
  }
  for (
    let steps = 0;
    steps < MAX_STREAK_BACKTRACK_DAYS / 7;
    steps++, weekStart = addDaysUtc(weekStart, -7)
  ) {
    if (!summationWeekMeetsFrequency(user, habitName, weekStart, daysPerWeek, eligible, reader))
      break;
    n++;
  }
  return n;
}

/** Returns the active weekly summation streak and its inclusive branded range. */
function currentWeeklySummationStreakRun(
  user: string,
  habitName: string,
  viewDate: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
  reader: HabitDataReader,
): StreakRun | null {
  const length = currentSummationStreakWeeks(
    user,
    habitName,
    viewDate,
    daysPerWeek,
    eligible,
    omitIncompleteViewWeek,
    reader,
  );
  if (length === 0) return null;

  let endWeekStart = weekStartMonday(viewDate);
  if (
    omitIncompleteViewWeek &&
    !summationWeekMeetsFrequency(user, habitName, endWeekStart, daysPerWeek, eligible, reader)
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

/** Builds the longest-streak API metadata for a single-select habit. */
function longestStreakForConfig(
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  daysPerWeek: number,
  firstDate: Day | null,
  omitEmptyViewPeriod: boolean,
  reader: HabitDataReader,
): LongestStreak | undefined {
  const weekly = !isDailyStreakFrequency(daysPerWeek);
  const run = weekly
    ? longestWeeklyStreakRun(user, habitName, viewDate, daysPerWeek, eligible, firstDate, reader)
    : longestDailyStreakRun(user, habitName, viewDate, eligible, firstDate, reader);
  if (!run) return undefined;

  const activeRun = weekly
    ? currentWeeklyStreakRun(
        user,
        habitName,
        viewDate,
        daysPerWeek,
        eligible,
        omitEmptyViewPeriod,
        reader,
      )
    : currentDailyStreakRun(user, habitName, viewDate, eligible, omitEmptyViewPeriod, reader);

  const range = weekly
    ? formatWeekRangeLabel(run.start, run.end)
    : formatDayRangeLabel(run.start, run.end);

  const isCurrent = activeRun != null && streakRunsEqual(run, activeRun);
  const text = formatSelectStreakText(run.length, weekly);
  const qualifier = formatLongestStreakQualifier(eligible, daysPerWeek);
  return {
    label: 'Longest streak',
    text: isCurrent ? `${text} (current)` : text,
    range,
    ...(qualifier ? { qualifier } : {}),
  };
}

/** Builds the longest-streak API metadata for a summation habit. */
function longestSummationStreakForConfig(
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  daysPerWeek: number,
  firstDate: Day | null,
  omitEmptyViewPeriod: boolean,
  reader: HabitDataReader,
): LongestStreak | undefined {
  const weekly = !isDailyStreakFrequency(daysPerWeek);
  const run = weekly
    ? longestWeeklySummationStreakRun(
        user,
        habitName,
        viewDate,
        daysPerWeek,
        eligible,
        firstDate,
        reader,
      )
    : longestDailySummationStreakRun(user, habitName, viewDate, eligible, firstDate, reader);
  if (!run) return undefined;

  const activeRun = weekly
    ? currentWeeklySummationStreakRun(
        user,
        habitName,
        viewDate,
        daysPerWeek,
        eligible,
        omitEmptyViewPeriod,
        reader,
      )
    : currentDailySummationStreakRun(
        user,
        habitName,
        viewDate,
        eligible,
        omitEmptyViewPeriod,
        reader,
      );

  const range = weekly
    ? formatWeekRangeLabel(run.start, run.end)
    : formatDayRangeLabel(run.start, run.end);

  const isCurrent = activeRun != null && streakRunsEqual(run, activeRun);
  const text = formatSelectStreakText(run.length, weekly);
  const qualifier = formatLongestStreakQualifier(eligible, daysPerWeek);
  return {
    label: 'Longest streak',
    text: isCurrent ? `${text} (current)` : text,
    range,
    ...(qualifier ? { qualifier } : {}),
  };
}

/** Adds optional longest-streak metadata to a single-select graph. */
function attachLongestStreak(
  graph: StreakGraphWithText,
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  daysPerWeek: number,
  showLongest: boolean,
  firstDate: Day | null,
  omitEmptyViewPeriod: boolean,
  reader: HabitDataReader,
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
    reader,
  );
  if (!longestStreak) return graph;
  return { ...graph, longestStreak };
}

/** Adds optional longest-streak metadata to a summation graph. */
function attachLongestSummationStreak(
  graph: StreakGraphWithText,
  user: string,
  habitName: string,
  viewDate: Day,
  eligible: ReadonlySet<string>,
  daysPerWeek: number,
  showLongest: boolean,
  firstDate: Day | null,
  omitEmptyViewPeriod: boolean,
  reader: HabitDataReader,
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
    reader,
  );
  if (!longestStreak) return graph;
  return { ...graph, longestStreak };
}

/** Builds the 53-week daily heatmap window for a single-select habit. */
function streakGraphDailyWindow(
  user: string,
  habitName: string,
  viewDate: Day,
  today: Day,
  eligible: ReadonlySet<string>,
  selectableValueMap: ReadonlyMap<string, number>,
  omitEmptyViewDate: boolean,
  reader: HabitDataReader,
): StreakGraphWithText {
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const end = addDaysUtc(viewDate, rightPaddingDays);
  const start = addDaysUtc(weekStartSunday(end), -(DAILY_STREAK_WINDOW_DAYS - WEEKDAY_ROW_COUNT));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const data = emptyStreakColumns();
  const rawFillValues: Array<number | undefined> = [];
  for (let i = 0; i < DAILY_STREAK_WINDOW_DAYS; i++) {
    const d = addDaysUtc(start, i);
    if (d > end) continue;
    const value = readerGetSelect(reader, user, habitName, d);
    rawFillValues.push(
      value == null ? undefined : (selectableValueMap.get(value) ?? (eligible.has(value) ? 1 : -1)),
    );
    addDailyStreakDatum(data, {
      date: d,
      value,
      ...(outlineViewDate && d === viewDate ? { outline: true } : {}),
      ...(d > viewDate ? { dimmed: true } : {}),
    });
  }
  applyStreakFillDistribution(data, rawFillValues);
  const current = currentSelectStreakLength(
    user,
    habitName,
    viewDate,
    eligible,
    omitEmptyViewDate,
    reader,
  );
  return {
    data,
    currentText: formatSelectStreakText(current),
  };
}

/** Builds the 126-bucket weekly heatmap window for a single-select habit. */
function streakGraphWeeklyWindow(
  user: string,
  habitName: string,
  viewDate: Day,
  today: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
  reader: HabitDataReader,
): StreakGraphWithText {
  const viewWeekStart = weekStartMonday(viewDate);
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const endWeekStart = weekStartMonday(addDaysUtc(viewDate, rightPaddingDays));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const data = emptyStreakColumns();
  const rawFillValues: Array<number | undefined> = [];
  for (let i = WEEKLY_STREAK_WINDOW_WEEKS - 1; i >= 0; i--) {
    const weekStart = addDaysUtc(endWeekStart, -i * 7);
    const weekEnd = addDaysUtc(weekStart, 6);
    const hits = countEligibleDaysInRange(user, habitName, weekStart, weekEnd, eligible, reader);
    const loggedDays = countLoggedDaysInRange(user, habitName, weekStart, weekEnd, reader);
    rawFillValues.push(loggedDays === 0 ? undefined : hits === 0 ? -1 : hits);
    addWeeklyStreakDatum(data, {
      date: weekStart,
      value: formatWeekProgressLabel(hits, daysPerWeek),
      label: formatWeekRangeLabel(weekStart, weekEnd),
      ...(outlineViewDate && weekStart === viewWeekStart ? { outline: true } : {}),
      ...(outlineViewDate && weekStart > viewWeekStart ? { dimmed: true } : {}),
    });
  }
  applyStreakFillDistribution(data, rawFillValues);
  const current = currentSelectStreakWeeks(
    user,
    habitName,
    viewDate,
    daysPerWeek,
    eligible,
    omitIncompleteViewWeek,
    reader,
  );
  return {
    data,
    currentText: formatSelectStreakText(current, true),
  };
}

/** Builds the 53-week daily heatmap window for a summation habit. */
function summationStreakGraphDailyWindow(
  user: string,
  habitName: string,
  viewDate: Day,
  today: Day,
  eligible: ReadonlySet<string>,
  omitEmptyViewDate: boolean,
  reader: HabitDataReader,
): StreakGraphWithText {
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const end = addDaysUtc(viewDate, rightPaddingDays);
  const start = addDaysUtc(weekStartSunday(end), -(DAILY_STREAK_WINDOW_DAYS - WEEKDAY_ROW_COUNT));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const data = emptyStreakColumns();
  const rawFillValues: Array<number | undefined> = [];
  for (let i = 0; i < DAILY_STREAK_WINDOW_DAYS; i++) {
    const d = addDaysUtc(start, i);
    if (d > end) continue;
    const total = readerGetSummationDayTotal(reader, user, habitName, d);
    rawFillValues.push(total ?? undefined);
    addDailyStreakDatum(data, {
      date: d,
      value: total == null ? null : String(total),
      ...(outlineViewDate && d === viewDate ? { outline: true } : {}),
      ...(d > viewDate ? { dimmed: true } : {}),
    });
  }
  applyStreakFillDistribution(data, rawFillValues);
  const current = currentSummationStreakLength(
    user,
    habitName,
    viewDate,
    eligible,
    omitEmptyViewDate,
    reader,
  );
  return {
    data,
    currentText: formatSelectStreakText(current),
  };
}

/** Builds the 126-bucket weekly heatmap window for a summation habit. */
function summationStreakGraphWeeklyWindow(
  user: string,
  habitName: string,
  viewDate: Day,
  today: Day,
  daysPerWeek: number,
  eligible: ReadonlySet<string>,
  omitIncompleteViewWeek: boolean,
  reader: HabitDataReader,
): StreakGraphWithText {
  const viewWeekStart = weekStartMonday(viewDate);
  const rightPaddingDays = graphRightPaddingDays(viewDate, today);
  const endWeekStart = weekStartMonday(addDaysUtc(viewDate, rightPaddingDays));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const data = emptyStreakColumns();
  const rawFillValues: Array<number | undefined> = [];
  for (let i = WEEKLY_STREAK_WINDOW_WEEKS - 1; i >= 0; i--) {
    const weekStart = addDaysUtc(endWeekStart, -i * 7);
    const weekEnd = addDaysUtc(weekStart, 6);
    const hits = countEligibleSummationDaysInRange(
      user,
      habitName,
      weekStart,
      weekEnd,
      eligible,
      reader,
    );
    const loggedDays = countLoggedSummationDaysInRange(user, habitName, weekStart, weekEnd, reader);
    rawFillValues.push(loggedDays === 0 ? undefined : hits === 0 ? -1 : hits);
    addWeeklyStreakDatum(data, {
      date: weekStart,
      value: formatWeekProgressLabel(hits, daysPerWeek),
      label: formatWeekRangeLabel(weekStart, weekEnd),
      ...(outlineViewDate && weekStart === viewWeekStart ? { outline: true } : {}),
      ...(outlineViewDate && weekStart > viewWeekStart ? { dimmed: true } : {}),
    });
  }
  applyStreakFillDistribution(data, rawFillValues);
  const current = currentSummationStreakWeeks(
    user,
    habitName,
    viewDate,
    daysPerWeek,
    eligible,
    omitIncompleteViewWeek,
    reader,
  );
  return {
    data,
    currentText: formatSelectStreakText(current, true),
  };
}

/**
 * Builds a select streak graph around `viewDate`.
 * `streakFrequency` uses `<days>d` (for example `3d`); the legacy `<days>d/1w` is also accepted.
 */
export function streakGraphForConfiguredWindow(
  user: string,
  habitName: string,
  viewDate: Day,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  tzOffsetMinutes?: number,
  streakFrequency?: string,
  showLongest = false,
  firstDate: Day | null = null,
  selectableValues: readonly string[] = streakEligibleOptions,
  reader?: HabitDataReader,
): StreakGraphWithText {
  const dataReader = requireHabitDataReader(reader);
  const eligible = new Set(streakEligibleOptions);
  const selectableValueMap = selectablePillToInt(selectableValues, streakEligibleOptions);
  const today = getHabitApiToday(at, tzOffsetMinutes);
  const omitEmptyViewPeriod = viewDate === today;
  const daysPerWeek = parseStreakFrequencyDays(streakFrequency);
  const graph = isDailyStreakFrequency(daysPerWeek)
    ? streakGraphDailyWindow(
        user,
        habitName,
        viewDate,
        today,
        eligible,
        selectableValueMap,
        omitEmptyViewPeriod,
        dataReader,
      )
    : streakGraphWeeklyWindow(
        user,
        habitName,
        viewDate,
        today,
        daysPerWeek,
        eligible,
        omitEmptyViewPeriod,
        dataReader,
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
    dataReader,
  );
}

/**
 * Builds a summation streak graph around `viewDate`.
 * Eligible options are numeric threshold strings and frequency uses `<days>d/1w`.
 */
export function summationStreakGraphForConfiguredWindow(
  user: string,
  habitName: string,
  viewDate: Day,
  streakEligibleOptions: readonly string[],
  at: Date = new Date(),
  tzOffsetMinutes?: number,
  streakFrequency?: string,
  showLongest = false,
  firstDate: Day | null = null,
  reader?: HabitDataReader,
): StreakGraphWithText {
  const dataReader = requireHabitDataReader(reader);
  const eligible = new Set(streakEligibleOptions);
  const today = getHabitApiToday(at, tzOffsetMinutes);
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
        dataReader,
      )
    : summationStreakGraphWeeklyWindow(
        user,
        habitName,
        viewDate,
        today,
        daysPerWeek,
        eligible,
        omitEmptyViewPeriod,
        dataReader,
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
    dataReader,
  );
}
