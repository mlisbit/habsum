export type Day = string & { readonly __brand: 'Day' };

export function dayFromString(value: string): Day {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Day must be encoded as YYYY-MM-DD');
  }

  return value as Day;
}

export type DayWithTime = string & { readonly __brand: 'DayWithTime' };

export function dayWithTimeFromString(value: string): DayWithTime {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    throw new Error('DayWithTime must be encoded as YYYY-MM-DD HH:MM:SS');
  }

  return value as DayWithTime;
}

/** Build {@link DayWithTime} from an ISO 8601 instant (UTC wall clock). */
export function dayWithTimeFromIso(iso: string): DayWithTime {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error('invalid ISO datetime');
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return dayWithTimeFromString(`${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`);
}

/**
 * Parse {@link DayWithTime} as a UTC calendar date + time (matches
 * {@link dayWithTimeFromIso} / server serialization).
 */
export function dateFromDayWithTimeUtc(value: DayWithTime): Date {
  const [datePart, timePart] = value.split(' ');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi, se] = timePart.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, se));
}

/**
 * Normalizes stored user `created_at` text (ISO 8601 from the app, or SQLite `YYYY-MM-DD HH:MM:SS`)
 * to the API {@link DayWithTime} shape. Empty or unparseable input falls back to the current instant
 * (DB layer should always persist a real timestamp after migration).
 */
export function accountCreatedAtToApi(value: string): DayWithTime {
  const t = value.trim();
  if (t === '') return dayWithTimeFromIso(new Date().toISOString());
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t)) {
    return dayWithTimeFromString(t);
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    return dayWithTimeFromIso(new Date().toISOString());
  }
  return dayWithTimeFromIso(d.toISOString());
}
