// Builds the weekly average insight card from habit history graph data.
import type { HabitHistory, HabitWidgetInsight } from '@habsum/types/common/habit';
import { dayFromString, type Day } from '@habsum/types/common/day';

/** Builds the average-per-day insight and its displayed history range. */
export function weeklyAverageInsight(
  history: HabitHistory | null | undefined,
  includeAbsentDaysInAverage = false,
): HabitWidgetInsight | null {
  if (!history) return null;
  const average = historyAverage(history, includeAbsentDaysInAverage);
  return {
    header: 'Average/day',
    description: average == null ? '—' : String(average),
    hover: historyAverageRangeText(history),
  };
}

/** Calculates a rounded daily average, optionally treating missing days as zero. */
function historyAverage(history: HabitHistory, includeAbsentDays: boolean): number | null {
  const allValues = Object.values(history.data.user.graphData).map((datum) => datum.value);
  const values = includeAbsentDays
    ? allValues
    : allValues.filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return Math.round(values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / values.length);
}

/** Formats a branded `YYYY-MM-DD` day as a localized short month-and-day label. */
function formatShortHistoryDate(dateKey: Day): string {
  const [ys, ms, ds] = dateKey.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dateKey;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Returns the first and last displayed history days for the insight hover text. */
function historyAverageRangeText(history: HabitHistory): string {
  const entries = Object.entries(history.data.user.graphData);
  const first = entries.at(0)?.[0];
  if (first == null) return 'today';
  const outlined = entries.find(([, datum]) => datum.outline === true)?.[0];
  const end = outlined == null ? 'today' : formatShortHistoryDate(dayFromString(outlined));
  return `${formatShortHistoryDate(dayFromString(first))} to ${end}`;
}
