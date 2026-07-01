import type { Habit } from '../common/habit.js';

export type HabitsPageProgress = {
  percent: number | null;
  caption: string | null;
  isComplete: boolean;
  ariaLabel: string;
};

export type HabitsPageCopy = {
  heading: string;
  subheader: string;
  progress: HabitsPageProgress;
};

/** Response body for `GET /users/:user/habits` */
export type HabitsResponse = {
  user: string;
  date: string;
  firstDate: string | null;
  page: HabitsPageCopy;
  habits: Habit[];
  serverTime: string;
};
