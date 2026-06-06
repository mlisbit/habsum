import { fromDateKey, toDateKey } from '@habsum/utils';

/**
 * Converts a calendar date key (YYYY-MM-DD) to a localized label ("Today", or weekday + date).
 *
 * When `today` is omitted it is inferred from "now" in `tzOffsetMinutes`.
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
