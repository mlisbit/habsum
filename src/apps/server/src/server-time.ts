import type { ServerTimeResponse } from '@habsum/types/common/misc';
import { fromDateKey, toDateKey } from '@habsum/utils/date';

/** `?date=` for GET: `YYYY-MM-DD` or `YYYY-MM-DD|<suffix>`; validates with {@link fromDateKey}. */
function habitQueryDateKey(raw: string): string | null {
  const pipe = raw.indexOf('|');
  if (pipe !== -1 && pipe !== 10) return null;
  const candidate = pipe === 10 ? raw.slice(0, 10) : raw;
  try {
    fromDateKey(candidate, 0);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Normalize API `clientCreatedAt` to SQLite `YYYY-MM-DD HH:MM:SS` (client wall clock).
 * Accepts that shape or legacy `YYYY-MM-DDTHH:MM:SS` (+ optional fractional/offset) for Date.parse.
 */
export function parseClientCreatedAtIso(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const trimmed = value.trim();
  const sql = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(trimmed);
  if (sql) {
    try {
      fromDateKey(sql[1], 0);
      return `${sql[1]} ${sql[2]}`;
    } catch {
      return null;
    }
  }
  if (Number.isNaN(Date.parse(trimmed))) return null;
  const legacy = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?/);
  if (legacy) return `${legacy[1]} ${legacy[2]}`;
  return null;
}

/**
 * UTC calendar day when a habit GET omits `?date=` (see {@link resolveHabitApiDateQuery}).
 */
export function defaultHabitApiDateKey(at: Date): string {
  return toDateKey(at, 0);
}

/** `Date#getTimezoneOffset()` from query/body (`undefined` when missing or invalid). */
export function parseTzOffsetMinutes(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < -840 || n > 840) return undefined;
  return n;
}

/** Client-local calendar “today” for streak omit logic (UTC when offset omitted). */
export function habitApiTodayKey(at: Date, tzOffsetMinutes?: number): string {
  return toDateKey(at, tzOffsetMinutes ?? 0);
}

/** Resolved habit `YYYY-MM-DD` for GET handlers (`?date=` optional; otherwise UTC “today”). */
export function resolveHabitApiDateQuery(rawDate: unknown, at: Date): string {
  const key = typeof rawDate === 'string' ? habitQueryDateKey(rawDate) : null;
  return key ?? defaultHabitApiDateKey(at);
}

export function apiServerTimeSnapshot(at: Date = new Date()): ServerTimeResponse {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || process.env.TZ || 'UTC';
  return {
    iso: at.toISOString(),
    timezone,
  };
}
