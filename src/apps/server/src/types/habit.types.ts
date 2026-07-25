// Explicit storage queries and hydrated habit data shared by repository and presentation layers.
import type { Day } from '@habsum/types/common/day';
import type { HabitType } from './userConfig.js';

export type HabitListQuery = {
  date?: string;
  today?: string;
  clientHour?: string;
};

export type HabitListViewContext = {
  viewDate: Day;
  today: Day;
  clientHour: number;
};

export type PatchBody = {
  habit?: unknown;
  total?: unknown;
  action?: unknown;
  value?: unknown;
  date?: unknown;
  clientCreatedAt?: unknown;
  eventId?: unknown;
  today?: unknown;
};

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

export type HabitDataMetadata = {
  familiarName: string;
  firstRecordedDate: Day | null;
};

export type HydratedSummationEvent = {
  id: number;
  date: Day;
  amount: number;
  createdAt: string;
};
