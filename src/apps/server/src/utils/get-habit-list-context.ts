import { getHabitApiDate, getHabitApiToday, getHabitClientHour } from './server-time-utils.js';
import type { HabitListQuery, HabitListViewContext } from '../types/habit.types.js';

export default function getHabitListContext({
  query,
  requestedAt,
}: {
  query: HabitListQuery;
  requestedAt: Date;
}): HabitListViewContext {
  return {
    viewDate: getHabitApiDate(query.date, requestedAt),
    today: getHabitApiToday(query.today, requestedAt),
    clientHour: getHabitClientHour(query.clientHour, requestedAt),
  };
}
