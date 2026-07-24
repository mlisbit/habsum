import type { HabitDataQuery, HabitListViewContext } from '../types/habit.types.js';
import type { UserConfig } from '../types/userConfig.js';
import getHabitInsightDataRange from './habits/get-habit-insight-data-range.js';

export default function getHabitListDataQuery({
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
      range: getHabitInsightDataRange(habit, context.viewDate, context.today),
    })),
  };
}
