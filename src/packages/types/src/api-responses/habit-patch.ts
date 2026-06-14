import type { HabitWidget, SummationEvent } from '../common/habit.js';

/** Response body for `PATCH /users/:user/habits` */
export type PatchHabitResponse =
  | {
      user: string;
      date: string;
      habit: string;
      value: string | null;
      type: 'single_select';
      options: string[];
      theme?: string;
      widgets?: HabitWidget[];
    }
  | {
      user: string;
      date: string;
      habit: string;
      total: number | null;
      events?: SummationEvent[];
      type: 'summation';
      goal: number | null;
      widgets?: HabitWidget[];
    };
