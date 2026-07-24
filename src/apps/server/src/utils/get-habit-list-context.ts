import { getHabitApiDate, getHabitApiToday, getTzOffsetMinutes } from './server-time-utils.js';
import type { HabitListQuery, HabitListViewContext } from '../types/habit.types.js';

export default function getHabitListContext({
  query,
  requestedAt,
}: {
  query: HabitListQuery;
  requestedAt: Date;
}): HabitListViewContext {
  const tzOffsetMinutes = getTzOffsetMinutes(query.tzOffsetMinutes);
  return {
    viewDate: getHabitApiDate(query.date, requestedAt),
    today: getHabitApiToday(requestedAt, tzOffsetMinutes),
    requestedAt,
    tzOffsetMinutes,
  };
}
