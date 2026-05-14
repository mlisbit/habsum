import {
  dayFromString,
  dayWithTimeFromString,
  type Day,
  type DayWithTime,
} from '@habsum/types/common/day';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Wall-clock fields of `date` after shifting by `tzOffsetMinutes` (see `toDateKey`). */
function shiftedWallClock(date: Date, tzOffsetMinutes: number): Date {
  return new Date(date.getTime() - tzOffsetMinutes * 60_000);
}

function dateKeyFromShifted(shifted: Date): string {
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/**
 * Convert a Date to a YYYY-MM-DD "date key" in a specific timezone offset.
 *
 * `tzOffsetMinutes` uses the same convention as `Date#getTimezoneOffset()`:
 * UTC = local time + offset (e.g. 480 for US Pacific in winter).
 */
export function toDateKey(date: Date, tzOffsetMinutes: number): Day {
  return dayFromString(dateKeyFromShifted(shiftedWallClock(date, tzOffsetMinutes)));
}

/**
 * Like {@link toDateKey}, but appends wall time as ` HH:MM:SS` (API / SQLite `clientCreatedAt` shape).
 */
export function toDateKeyWithTime(date: Date, tzOffsetMinutes: number): DayWithTime {
  const shifted = shiftedWallClock(date, tzOffsetMinutes);
  const day = dateKeyFromShifted(shifted);
  const hh = shifted.getUTCHours();
  const mi = shifted.getUTCMinutes();
  const s = shifted.getUTCSeconds();
  return dayWithTimeFromString(`${day} ${pad2(hh)}:${pad2(mi)}:${pad2(s)}`);
}

/**
 * Convert a YYYY-MM-DD "date key" into a Date representing midnight at that key
 * in the timezone described by tzOffsetMinutes.
 *
 * tzOffsetMinutes uses the same convention as Date#getTimezoneOffset():
 *   UTC = local time + tzOffsetMinutes.
 */
export function fromDateKey(dateKey: string, tzOffsetMinutes: number): Date {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`Invalid date key: "${dateKey}"`);
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const day = Number(m[3]); // 1-31

  const utcAtLocalMidnight = Date.UTC(year, month - 1, day) + tzOffsetMinutes * 60_000;
  return new Date(utcAtLocalMidnight);
}
