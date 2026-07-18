// Date-window utilities for fetching enough interim data to build habit insights.
import type { Day } from '@habsum/types/common/day';
import { isDailyStreakFrequency, parseStreakFrequencyDays } from '@habsum/types/common/streak';
import { fromDateKey, toDateKey } from '@habsum/utils/date';
import type { HabitDef } from '../../config.js';
import type { HabitDataRange } from '../../types/habit.types.js';

const WEEKDAY_ROW_COUNT = 7;
const DAILY_STREAK_WINDOW_DAYS = 53 * 7;
const WEEKLY_STREAK_WINDOW_WEEKS = 126;
const GRAPH_RIGHT_PADDING_DAYS = 3;

function addDaysUtc(date: Day, delta: number): Day {
  const dt = fromDateKey(date, 0);
  const next = new Date(dt.getTime() + delta * 86_400_000);
  return toDateKey(next, 0);
}

function weekdayRowIndex(date: Day): number {
  return fromDateKey(date, 0).getUTCDay();
}

function weekStartSunday(date: Day): Day {
  return addDaysUtc(date, -weekdayRowIndex(date));
}

function weekStartMonday(date: Day): Day {
  const index = weekdayRowIndex(date);
  return addDaysUtc(date, index === 0 ? -6 : 1 - index);
}

function parsePeriodDays(period: string): number | null {
  const m = period.match(/^(\d+)([dw])$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2];
  return unit === 'w' ? n * 7 : n;
}

function graphRightPaddingDays(viewDate: Day, today: Day): number {
  if (viewDate >= today) return 0;
  const diff = Math.round(
    (fromDateKey(today, 0).getTime() - fromDateKey(viewDate, 0).getTime()) / 86_400_000,
  );
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.min(GRAPH_RIGHT_PADDING_DAYS, diff);
}

function mergeRange(a: HabitDataRange, b: HabitDataRange): HabitDataRange {
  return {
    start: a.start < b.start ? a.start : b.start,
    end: a.end > b.end ? a.end : b.end,
  };
}

function weeklyHistoryInsightRange(viewDate: Day, today: Day, period: string): HabitDataRange {
  const days = parsePeriodDays(period) ?? 7;
  const end = addDaysUtc(viewDate, graphRightPaddingDays(viewDate, today));
  const start = addDaysUtc(end, -(days - 1));
  return { start, end };
}

function dailyStreakInsightRange(viewDate: Day, today: Day): HabitDataRange {
  const end = addDaysUtc(viewDate, graphRightPaddingDays(viewDate, today));
  const start = addDaysUtc(weekStartSunday(end), -(DAILY_STREAK_WINDOW_DAYS - WEEKDAY_ROW_COUNT));
  return { start, end };
}

function weeklyStreakInsightRange(viewDate: Day, today: Day): HabitDataRange {
  const endWeekStart = weekStartMonday(
    addDaysUtc(viewDate, graphRightPaddingDays(viewDate, today)),
  );
  const start = addDaysUtc(endWeekStart, -(WEEKLY_STREAK_WINDOW_WEEKS - 1) * 7);
  return { start, end: addDaysUtc(endWeekStart, 6) };
}

function streakInsightRange(
  habit: HabitDef,
  viewDate: Day,
  today: Day,
  firstDate: Day | null,
): HabitDataRange {
  const daysPerWeek = parseStreakFrequencyDays(habit.streak?.frequency);
  const graphRange = isDailyStreakFrequency(daysPerWeek)
    ? dailyStreakInsightRange(viewDate, today)
    : weeklyStreakInsightRange(viewDate, today);

  // Current/longest streak calculations may scan before the graph window.
  return firstDate == null
    ? graphRange
    : mergeRange(graphRange, { start: firstDate, end: graphRange.end });
}

export function habitInsightDataRange(
  habit: HabitDef,
  viewDate: Day,
  today: Day,
  firstDate: Day | null,
): HabitDataRange {
  let range: HabitDataRange = { start: viewDate, end: viewDate };

  if (habit.history?.displays.includes('weekly_history')) {
    range = mergeRange(range, weeklyHistoryInsightRange(viewDate, today, habit.history.period));
  }
  if (habit.history?.displays.includes('heatmap')) {
    range = mergeRange(range, dailyStreakInsightRange(viewDate, today));
  }
  if (habit.streak) {
    range = mergeRange(range, streakInsightRange(habit, viewDate, today, firstDate));
  }

  return range;
}
