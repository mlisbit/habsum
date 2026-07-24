import type { SummationEvent } from '@habsum/types/common/habit';
import type { HydratedSummationEvent } from '../types/habit.types.js';

/**
 * Split SQLite `datetime('now')` style value (`YYYY-MM-DD HH:MM:SS` or date-only)
 * into API-facing day and time strings. Does not interpret time zones.
 */
export function getSqliteCreatedAtParts(createdAt: string): { day: string; time: string } {
  const s = createdAt.trim();
  const space = s.indexOf(' ');
  if (space === -1) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { day: s, time: '' };
    return { day: '', time: s };
  }
  return { day: s.slice(0, space), time: s.slice(space + 1).trim() };
}

export function getApiSummationEvent(row: HydratedSummationEvent): SummationEvent {
  const { day, time } = getSqliteCreatedAtParts(row.createdAt);
  return { id: row.id, amount: row.amount, createdAt: { day, time } };
}

export function getApiSummationEvents(rows: HydratedSummationEvent[]): SummationEvent[] {
  return rows.map(getApiSummationEvent);
}
