// Converts hydrated habit data and user configuration into client-facing API models.
import type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { Habit } from '@habsum/types/common/habit';
import { HabitBuilder } from '../builders/habit-builder.js';
import { HabitResultBuilder } from '../builders/habit-result-builder.js';
import type { HabitDataSnapshot } from '../types/habit.types.js';
import type { UserConfig } from '../types/userConfig.js';
import type { HabitListViewContext } from './habits/habit-data-query.js';
import { habitRepeatsOnDate } from './habits/habit-repeat.js';

type HabitPresentationInput = {
  config: UserConfig;
  context: HabitListViewContext;
  data: HabitDataSnapshot;
};

export class HabitPresentationService {
  presentHabitList({ config, context, data }: HabitPresentationInput): HabitsResponse {
    const visibleConfig = {
      ...config,
      habits: config.habits.filter((habit) => habitRepeatsOnDate(habit, context.viewDate)),
    };
    const habits = this.buildHabits(visibleConfig, context, data);

    return new HabitResultBuilder({
      data,
      config,
      habits,
      today: context.today,
      at: context.requestedAt,
      tzOffsetMinutes: context.tzOffsetMinutes,
    }).build();
  }

  presentHabit({
    config,
    context,
    data,
    habitName,
  }: HabitPresentationInput & { habitName: string }): Habit {
    const definition = config.habits.find((habit) => habit.name === habitName);
    if (!definition) throw new Error(`habit "${habitName}" is not configured`);

    const [habit] = this.buildHabits({ ...config, habits: [definition] }, context, data);
    if (!habit) throw new Error(`failed to present configured habit "${habitName}"`);
    return habit;
  }

  private buildHabits(
    config: UserConfig,
    context: HabitListViewContext,
    data: HabitDataSnapshot,
  ): Habit[] {
    const dataByHabitName = new Map(data.habits.map((habitData) => [habitData.name, habitData]));

    return config.habits.map((definition) => {
      const habitData = dataByHabitName.get(definition.name);
      if (!habitData) {
        throw new Error(`missing hydrated data for configured habit "${definition.name}"`);
      }

      const builder = new HabitBuilder(definition, config, habitData, {
        data,
        at: context.requestedAt,
        tzOffsetMinutes: context.tzOffsetMinutes,
      });

      if (definition.data_visualization?.heatmap !== undefined) builder.withHeatMap();

      if (habitData.type === 'summation' && definition.data_visualization?.bargraph) {
        builder.withBarGraph();
      }

      if (habitData.type === 'summation' && definition.insights.includes('average')) {
        builder.withInsights(['weeklyAverage']);
      }

      if (definition.insights.includes('current_streak')) {
        builder.withInsights(['currentStreak']);
      }
      if (definition.insights.includes('longest_streak')) {
        builder.withInsights(['longestStreak']);
      }

      return builder.build();
    });
  }
}
