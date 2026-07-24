// Translates habit use cases into the narrow query contract understood by persistence.
import type { Day } from '@habsum/types/common/day';
import {
  habitApiTodayKey,
  parseTzOffsetMinutes,
  resolveHabitApiDateQuery,
} from '../../server-time.js';
import type { HabitDataQuery } from '../../types/habit.types.js';
import type { HabitDef, UserConfig } from '../../types/userConfig.js';
import { habitInsightDataRange } from './habit-data-range.js';

export type HabitListQuery = {
  date?: string;
  tzOffsetMinutes?: string;
};

export type HabitListViewContext = {
  viewDate: Day;
  today: Day;
  requestedAt: Date;
  tzOffsetMinutes?: number;
};

export function resolveHabitListContext({
  query,
  requestedAt,
}: {
  query: HabitListQuery;
  requestedAt: Date;
}): HabitListViewContext {
  const tzOffsetMinutes = parseTzOffsetMinutes(query.tzOffsetMinutes);
  return {
    viewDate: resolveHabitApiDateQuery(query.date, requestedAt),
    today: habitApiTodayKey(requestedAt, tzOffsetMinutes),
    requestedAt,
    tzOffsetMinutes,
  };
}

export function buildHabitListDataQuery({
  config,
  context,
}: {
  config: UserConfig;
  context: HabitListViewContext;
}): HabitDataQuery {
  return {
    user: config.user,
    viewDate: context.viewDate,
    habits: config.habits.map((habit) => ({
      name: habit.name,
      type: habit.type,
      range: habitInsightDataRange(habit, context.viewDate, context.today),
    })),
  };
}

export function buildHabitHistoryDataQuery({
  user,
  habits,
  viewDate,
}: {
  user: string;
  habits: HabitDef[];
  viewDate: Day;
}): HabitDataQuery {
  return {
    user,
    viewDate,
    habits: habits.map((habit) => ({
      name: habit.name,
      type: habit.type,
      range: 'all',
    })),
  };
}
