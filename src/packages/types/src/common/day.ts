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
