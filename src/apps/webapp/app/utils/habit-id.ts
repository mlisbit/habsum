import { dasherize } from '@habsum/utils';

/** Query param on `/users/:user/settings/config` for deep-linking the habit edit modal. */
export const CONFIG_EDIT_HABIT_QUERY_PARAM = 'habit';

/**
 * Lowercase, dasherize, and safe-guard a habit name for a URL path segment
 * (e.g. `My Habit` → `my-habit`).
 */
export function habitIdPathSegment(name: string): string {
  return dasherize(name);
}

/** Value for {@link CONFIG_EDIT_HABIT_QUERY_PARAM} derived from a habit display name. */
export function configEditHabitQueryValue(habitName: string): string {
  return habitIdPathSegment(habitName);
}

export function readConfigEditHabitId(search: string): string | null {
  const raw = new URLSearchParams(search).get(CONFIG_EDIT_HABIT_QUERY_PARAM);
  if (!raw || raw.trim() === '') return null;
  return raw.trim();
}

export function withConfigEditHabitId(search: string, habitId: string | null): string {
  const qs = new URLSearchParams(search);
  if (habitId) qs.set(CONFIG_EDIT_HABIT_QUERY_PARAM, habitId);
  else qs.delete(CONFIG_EDIT_HABIT_QUERY_PARAM);
  const next = qs.toString();
  return next ? `?${next}` : '';
}

export function findHabitNameByConfigEditId(
  habits: ReadonlyArray<{ name: string }>,
  habitId: string,
): string | null {
  for (const habit of habits) {
    if (configEditHabitQueryValue(habit.name) === habitId) return habit.name;
  }
  return null;
}

/** Settings config URL that opens the GUI edit modal for a habit. */
export function configEditHabitUrl(user: string, habitName: string): string {
  const search = withConfigEditHabitId('', configEditHabitQueryValue(habitName));
  return `/users/${encodeURIComponent(user)}/settings/config${search}`;
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
