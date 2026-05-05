import { dasherize } from '@habsum/utils';

/**
 * Lowercase, dasherize, and safe-guard a habit name for a URL path segment
 * (e.g. `My Habit` → `my-habit`).
 */
export function habitIdPathSegment(name: string): string {
  return dasherize(name);
}

export function habitDetailUrl(user: string, habitName: string, search = ''): string {
  const current = new URLSearchParams(search);
  const qs = new URLSearchParams();
  qs.set('filter', habitIdPathSegment(habitName));

  for (const [key, value] of current) {
    if (key !== 'filter') qs.append(key, value);
  }

  return `/users/${encodeURIComponent(user)}/habits/detail?${qs.toString()}`;
}
