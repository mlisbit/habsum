import { fromDateKey, toDateKey } from '@habsum/utils/date';

/**
 * Add whole days to a YYYY-MM-DD date key in the given timezone.
 */
export function addDays(dateKey: string, delta: number, tzOffsetMinutes: number): string {
  const dt = fromDateKey(dateKey, tzOffsetMinutes);
  const next = new Date(dt.getTime() + delta * 86_400_000);
  return toDateKey(next, tzOffsetMinutes);
}

/**
 * Calendar-day difference between two date keys in the given timezone.
 */
export function diffDays(a: string, b: string, tzOffsetMinutes: number): number {
  const da = fromDateKey(a, tzOffsetMinutes);
  const db = fromDateKey(b, tzOffsetMinutes);
  return Math.round((da.getTime() - db.getTime()) / 86_400_000);
}

/**
 * Converts a calendar date key (YYYY-MM-DD) to a localized label (“Today”, or weekday + date).
 *
 * When `today` is omitted it is inferred from “now” in `tzOffsetMinutes`.
 */
/**
 * Milliseconds from `now` until the next local calendar day starts.
 */
export function msUntilNextLocalDay(tzOffsetMinutes: number, now: Date = new Date()): number {
  const todayKey = toDateKey(now, tzOffsetMinutes);
  const nextDayStart = fromDateKey(addDays(todayKey, 1, tzOffsetMinutes), tzOffsetMinutes);
  return Math.max(0, nextDayStart.getTime() - now.getTime());
}

/**
 * Converts a calendar date key (YYYY-MM-DD) to a localized label (“Today”, or weekday + date).
 *
 * When `today` is omitted it is inferred from “now” in `tzOffsetMinutes`.
 */
export function formatHumanDate(dateKey: string, tzOffsetMinutes: number, today?: string): string {
  const todayKey = today ?? toDateKey(new Date(), tzOffsetMinutes);
  if (dateKey === todayKey) return 'Today';

  const currentYear = new Date().getFullYear();
  const d = fromDateKey(dateKey, tzOffsetMinutes);
  const includeYear = d.getFullYear() !== currentYear;

  const fmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  });
  return fmt.format(d);
}
