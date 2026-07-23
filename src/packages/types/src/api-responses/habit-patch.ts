import type { HabitRow, HabitType } from '../common/habit.js';

export type HabitPatch =
  | { habit: string; total: number }
  | { habit: string; value: string }
  | { habit: string; action: 'clear' }
  | { habit: string; action: 'delete_event'; eventId: number };

/** Response body for `PATCH /users/:user/habits` */
export type PatchHabitResponse = {
  [K in HabitType]: Omit<HabitRow<K>, 'name'> & {
    user: string;
    date: string;
    habit: string;
  };
}[HabitType];
