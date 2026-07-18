// Interim habit data types shared between resource, factory, and builder layers.
import type { Day } from '@habsum/types/common/day';
import type { HabitDef, UserConfig } from './userConfig.js';

export type HabitDataRange = {
  start: Day;
  end: Day;
};

type InterimHabitBase = {
  dataStart: Day;
  dataEnd: Day;
};

export type InterimHabit =
  | (InterimHabitBase & {
      type: 'single_select';
      config: HabitDef;
      values: Array<{ date: Day; value: string }>;
    })
  | (InterimHabitBase & {
      type: 'summation';
      config: HabitDef;
      totals: Array<{ date: Day; total: number }>;
    });

export type InterimHabitsData = {
  user: string;
  date: Day;
  today: Day;
  firstDate: Day | null;
  config: UserConfig;
  habits: InterimHabit[];
};

export type InterimSummationEvent = {
  id: number;
  date: string;
  amount: number;
  createdAt: string;
};

export type InterimHabitHistoryRow =
  | {
      day: Day;
      type: 'single_select';
      habit: string;
      value: string;
    }
  | {
      day: Day;
      type: 'summation';
      habit: string;
      total: number;
      events: InterimSummationEvent[];
    };

export type HabitDataReader = {
  getSelect(user: string, habit: string, date: Day): string | null;
  getSummationDayTotal(user: string, habit: string, date: Day): number | null;
  getSeries(
    user: string,
    habit: string,
    startDate: Day,
    endDate: Day,
  ): Array<{ date: Day; total: number }>;
};
