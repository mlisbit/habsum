import type { Day } from '@habsum/types/common/day';
import type { HabitDataQuery } from '../types/habit.types.js';
import type { HabitDef } from '../types/userConfig.js';

export default function getHabitHistoryDataQuery({
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
