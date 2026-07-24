import type { Day } from '@habsum/types/common/day';
import { HABIT_REPEAT_DAYS, type HabitDef } from '../../types/userConfig.js';

function repeatDayForDate(date: Day): string {
  const dayIndex = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return HABIT_REPEAT_DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
}

export function habitRepeatsOnDate(habit: HabitDef, date: Day): boolean {
  return habit.repeat.includes(repeatDayForDate(date));
}
