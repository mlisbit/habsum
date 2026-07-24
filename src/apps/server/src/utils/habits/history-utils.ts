// Weekly habit-history graph construction from hydrated habit data.
import type { BarGraphData } from '@habsum/types/common/bar-chart';
import type { Day } from '@habsum/types/common/day';
import type { HabitHistory } from '@habsum/types/common/habit';
import { habitApiTodayKey } from '../../server-time.js';
import type { HabitDataReader } from '../../types/habit.types.js';
import {
  addDaysUtc,
  formatHistoryDayHoverLabel,
  graphRightPaddingDays,
  shouldOutlineViewDate,
} from './date-utils.js';

/** Ensures graph builders received a reader backed by hydrated habit data. */
function requireHabitDataReader(reader: HabitDataReader | undefined): HabitDataReader {
  if (!reader) throw new Error('habit history requires hydrated habit data');
  return reader;
}

/** Parses history periods such as `7d`, `1w`, or `3w` into a day count. */
function parsePeriodDays(period: string): number | null {
  const match = period.match(/^(\d+)([dw])$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return match[2] === 'w' ? amount * 7 : amount;
}

/** Y-axis max for history bars, respecting both logged totals and the configured goal. */
export function historyGraphScaleTop(
  values: readonly number[],
  goal: number | null | undefined,
): number {
  const maxValue = values.length === 0 ? 0 : Math.max(...values);
  const goalFloor = goal != null && goal > 0 ? goal : 0;
  return Math.max(1, maxValue, goalFloor);
}

/** Builds daily history bars ending near `viewDate`; `periodSpec` uses `<number>d` or `<number>w`. */
export function habitHistoryForConfiguredPeriod(
  user: string,
  habitName: string,
  viewDate: Day,
  firstDate: Day | null,
  periodSpec: string,
  goal: number | null | undefined = null,
  at: Date = new Date(),
  tzOffsetMinutes?: number,
  reader?: HabitDataReader,
): HabitHistory {
  const dataReader = requireHabitDataReader(reader);
  const days = parsePeriodDays(periodSpec) ?? 7;
  const today = habitApiTodayKey(at, tzOffsetMinutes);
  const end = addDaysUtc(viewDate, graphRightPaddingDays(viewDate, today));
  const start = addDaysUtc(end, -(days - 1));
  const outlineViewDate = shouldOutlineViewDate(viewDate, today);
  const rows = dataReader.getSeries(user, habitName, start, end);
  const totalsByDate = new Map(rows.map((row) => [row.date, row.total]));
  const series = Array.from({ length: days }, (_, index) => {
    const date = addDaysUtc(start, index);
    if (firstDate && date < firstDate) return null;
    return totalsByDate.get(date) ?? null;
  });
  const top = historyGraphScaleTop(
    series.filter((value): value is number => value != null),
    goal,
  );
  const graphData: BarGraphData = {};
  for (let index = 0; index < days; index++) {
    const date = addDaysUtc(start, index);
    graphData[date] = {
      value: series[index]!,
      top,
      hoverLabel: formatHistoryDayHoverLabel(date),
      ...(outlineViewDate && date === viewDate ? { outline: true } : {}),
      ...(outlineViewDate && date > viewDate ? { dimmed: true } : {}),
    };
  }
  return { data: { user: { graphData } } };
}
