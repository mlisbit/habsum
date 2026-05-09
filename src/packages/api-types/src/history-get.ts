import type { Habit } from './index.js';

export type HistoryGetResponse = {
  user: string;
  habits: Record<string, string>;
  firstDate: string | null;
  data: {
    user: Array<{
      day: string;
      habits: Habit[];
    }>;
  };
  serverTime: string;
};
