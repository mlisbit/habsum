import type { Day } from '@habsum/types/common/day';
import { fromDateKey, toDateKey } from '@habsum/utils/date';

const DAY_IN_MILLISECONDS = 86_400_000;

export type HabitViewOptions = {
  viewingDate: Day;
  today: Day;
};

export function getDayAfter(date: Day, delta: number): Day {
  return toDateKey(new Date(fromDateKey(date, 0).getTime() + delta * DAY_IN_MILLISECONDS), 0);
}

export function getGraphRightPaddingDays(viewingDate: Day, today: Day): number {
  if (viewingDate >= today) return 0;
  const difference = Math.round(
    (fromDateKey(today, 0).getTime() - fromDateKey(viewingDate, 0).getTime()) / DAY_IN_MILLISECONDS,
  );
  return Number.isFinite(difference) && difference > 0 ? Math.min(3, difference) : 0;
}

export function getDayRangeLabel(start: Day, end: Day): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  return `${getLocalizedDayLabel(start, options)} – ${getLocalizedDayLabel(end, options)}`;
}

export function getShortDate(date: Day): string {
  return getLocalizedDayLabel(date, { month: 'short', day: 'numeric' });
}

export function getStreakText(current: number, weekly: boolean): string {
  if (weekly) return current === 1 ? '1 week' : `${current} weeks`;
  return current === 1 ? '1 day' : `${current} days`;
}

export function getStreakRangeLength([start, end]: [Day, Day], weekly: boolean): number {
  const days =
    Math.round(
      (fromDateKey(end, 0).getTime() - fromDateKey(start, 0).getTime()) / DAY_IN_MILLISECONDS,
    ) + 1;
  return weekly ? Math.round(days / 7) : days;
}

function getLocalizedDayLabel(date: Day, options: Intl.DateTimeFormatOptions): string {
  const [yearText, monthText, dayText] = date.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return date;

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, options);
}
