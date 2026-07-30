import type { Day } from '@habsum/types/common/day';
import { fromDateKey, toDateKey } from '@habsum/utils/date';
import { HABIT_REPEAT_DAYS, type HabitDef } from '../../types/userConfig.js';

const DAY_IN_MILLISECONDS = 86_400_000;

export default function getTextHabitResetWindowStart(
  habit: HabitDef<'text'>,
  viewingDate: Day,
): Day {
  const viewingDateTime = fromDateKey(viewingDate, 0);

  for (let daysAgo = 0; daysAgo < HABIT_REPEAT_DAYS.length; daysAgo++) {
    const candidate = new Date(viewingDateTime.getTime() - daysAgo * DAY_IN_MILLISECONDS);
    const dayIndex = candidate.getUTCDay();
    const weekday = HABIT_REPEAT_DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
    if (habit.settings.reset.includes(weekday)) {
      return toDateKey(candidate, 0);
    }
  }

  return viewingDate;
}
