// Shared UTC date arithmetic and labels for graph visualizations.
import type { Day } from '@habsum/types/common/day';
import { fromDateKey, toDateKey } from '@habsum/utils/date';

const GRAPH_RIGHT_PADDING_DAYS = 3;

/** Adds whole UTC calendar days to a branded `YYYY-MM-DD` value. */
export function addDaysUtc(date: Day, delta: number): Day {
  const parsed = fromDateKey(date, 0);
  const next = new Date(parsed.getTime() + delta * 86_400_000);
  return toDateKey(next, 0);
}

/** Formats a branded `YYYY-MM-DD` value for a localized graph hover label. */
export function formatHistoryDayHoverLabel(dateKey: Day): string {
  const [yearText, monthText, dayText] = dateKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return dateKey;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Returns up to three future-facing graph cells between the viewed day and today. */
export function graphRightPaddingDays(viewDate: Day, today: Day): number {
  if (viewDate >= today) return 0;
  const difference = Math.round(
    (fromDateKey(today, 0).getTime() - fromDateKey(viewDate, 0).getTime()) / 86_400_000,
  );
  if (!Number.isFinite(difference) || difference <= 0) return 0;
  return Math.min(GRAPH_RIGHT_PADDING_DAYS, difference);
}

/** Indicates whether the viewed day needs an outline because it is not today. */
export function shouldOutlineViewDate(viewDate: Day, today: Day): boolean {
  return viewDate !== today;
}
