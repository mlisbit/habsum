import type { Day } from '@habsum/types/common/day';
import { fromDateKey } from '@habsum/utils/date';
import { getDayAfter } from '../utils.js';

export function getMondayWeekStart(date: Day): Day {
  const weekday = fromDateKey(date, 0).getUTCDay();
  return getDayAfter(date, -((weekday + 6) % 7));
}
