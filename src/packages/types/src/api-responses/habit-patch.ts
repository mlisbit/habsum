import type { StreakGraphData } from '../common/streak.js';
import type { SummationEvent } from '../common/habit.js';

/** Response body for `PATCH /users/:user/habits` */
export type PatchHabitResponse =
  | {
      user: string;
      date: string;
      habit: string;
      value: string | null;
      type: 'single_select';
      options: string[];
      /** Same shape as `GET .../habits` when YAML defines `streak`. */
      streak?: StreakGraphData;
    }
  | {
      user: string;
      date: string;
      habit: string;
      total: number | null;
      events?: SummationEvent[];
      type: 'summation';
      goal: number | null;
    };
