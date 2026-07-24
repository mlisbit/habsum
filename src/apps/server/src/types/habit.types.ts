// Explicit storage queries and hydrated habit data shared by repository and presentation layers.
import type { Day } from '@habsum/types/common/day';
import type { HabitType } from './userConfig.js';

export type HabitDataRange = {
  start: Day;
  end: Day;
};

export type HabitDataRangeRequest = HabitDataRange & {
  extendToFirstRecordedDate?: boolean;
};

export type HabitDataSelection = {
  name: string;
  type: HabitType;
  range: HabitDataRangeRequest | 'all';
};

export type HabitDataQuery = {
  user: string;
  viewDate: Day;
  habits: HabitDataSelection[];
};

type HydratedHabitDataBase = {
  name: string;
  dataStart: Day;
  dataEnd: Day;
};

export type HydratedHabitData =
  | (HydratedHabitDataBase & {
      type: 'single_select';
      values: Array<{ date: Day; value: string }>;
    })
  | (HydratedHabitDataBase & {
      type: 'summation';
      totals: Array<{ date: Day; total: number }>;
      events: HydratedSummationEvent[];
    });

export type HabitDataSnapshot = {
  user: string;
  familiarName: string;
  viewDate: Day;
  firstRecordedDate: Day | null;
  habits: HydratedHabitData[];
};

export type HydratedSummationEvent = {
  id: number;
  date: Day;
  amount: number;
  createdAt: string;
};

export type HabitDataReader = {
  getSelect(user: string, habit: string, date: Day): string | null;
  getFirstSelectDate(user: string, habit: string): Day | null;
  getSeries(
    user: string,
    habit: string,
    startDate: Day,
    endDate: Day,
  ): Array<{ date: Day; total: number }>;
};
