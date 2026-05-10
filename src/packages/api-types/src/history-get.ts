import type { Habit } from './index.js';

export type HistoryGetResponse = {
  user: string;
  habits: Record<string, string>;
  firstDate: string | null;
  /** Habits for the inspected day (`?date=` or today), one entry per filtered habit (same order as filter). */
  data: Habit[];
  history: {
    user: Array<{
      day: string;
      habits: Habit[];
    }>;
  };
  serverTime: string;
};
