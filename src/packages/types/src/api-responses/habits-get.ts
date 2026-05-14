import type { Habit } from '../common/habit.js';

/** Response body for `GET /users/:user/habits` */
export type HabitsResponse = {
  user: string;
  date: string;
  firstDate: string | null;
  habits: Habit[];
  serverTime: string;
};
