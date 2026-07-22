// Creates configured habit builders for each interim habit returned by the resource layer.
import type { InterimHabitsData } from '../types/habit.types.js';
import { HabitBuilder } from '../builders/habit-builder.js';

type HabitFactoryInput = {
  data: InterimHabitsData;
  at: Date;
  tzOffsetMinutes?: number;
};

export class HabitFactory {
  constructor(private readonly input: HabitFactoryInput) {}

  builders(): HabitBuilder[] {
    const { data, at, tzOffsetMinutes } = this.input;

    return data.habits.map((interimHabit) => {
      const h = interimHabit.config;
      const builder = new HabitBuilder(h.name, data.config, interimHabit, {
        data,
        at,
        tzOffsetMinutes,
      });

      if (h.data_visualization?.heatmap !== undefined) builder.withHeatMap();

      if (interimHabit.type === 'summation' && h.data_visualization?.bargraph) {
        builder.withBarGraph();
      }

      if (interimHabit.type === 'summation' && h.insights.includes('average')) {
        builder.withInsights(['weeklyAverage']);
      }

      if (h.insights.includes('current_streak')) builder.withInsights(['currentStreak']);
      if (h.insights.includes('longest_streak')) builder.withInsights(['longestStreak']);

      return builder;
    });
  }
}
