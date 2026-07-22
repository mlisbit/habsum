// Builds one API habit row from interim habit data and selected presentation options.
import type { Habit } from '@habsum/types/common/habit';
import type { InterimHabit, InterimHabitsData } from '../types/habit.types.js';
import type { UserConfig } from '../types/userConfig.js';
import {
  buildHabitWidgets,
  interimHabitTotal,
  interimHabitValue,
} from './_private/habit-insight-widgets.js';

export type HabitInsightKind = 'weeklyAverage' | 'currentStreak' | 'longestStreak';

type HabitBuilderContext = {
  data: InterimHabitsData;
  at: Date;
  tzOffsetMinutes?: number;
};

export class HabitBuilder {
  private readonly insights = new Set<HabitInsightKind>();
  private includeHeatMap = false;
  private includeBarGraph = false;

  constructor(
    private readonly habitName: string,
    private readonly config: UserConfig,
    private readonly interimHabit: InterimHabit,
    private readonly context: HabitBuilderContext,
  ) {}

  withInsights(insights: HabitInsightKind[]): this {
    for (const insight of insights) this.insights.add(insight);
    return this;
  }

  withHeatMap(): this {
    this.includeHeatMap = true;
    return this;
  }

  withBarGraph(): this {
    this.includeBarGraph = true;
    return this;
  }

  build(): Habit {
    const h = this.interimHabit.config;
    const widgets = buildHabitWidgets({
      data: this.context.data,
      habit: this.interimHabit,
      at: this.context.at,
      tzOffsetMinutes: this.context.tzOffsetMinutes,
      includeBarGraph: this.includeBarGraph,
      includeHeatMap: this.includeHeatMap,
      includeCurrentStreakInsight: this.insights.has('currentStreak'),
      includeLongestStreakInsight: this.insights.has('longestStreak'),
      includeWeeklyAverageInsight: this.insights.has('weeklyAverage'),
    });

    if (this.interimHabit.type === 'single_select') {
      return {
        name: this.habitName,
        goal: h.goal,
        type: 'single_select',
        options: h.options ?? [],
        ...(h.theme ? { theme: h.theme } : {}),
        value: interimHabitValue(this.interimHabit, this.context.data),
        ...(widgets.length > 0 ? { widgets } : {}),
      };
    }

    return {
      name: this.habitName,
      goal: h.goal,
      type: 'summation',
      total: interimHabitTotal(this.interimHabit, this.context.data),
      ...(h.summationOptions ? { summationOptions: h.summationOptions } : {}),
      ...(widgets.length > 0 ? { widgets } : {}),
    };
  }
}
