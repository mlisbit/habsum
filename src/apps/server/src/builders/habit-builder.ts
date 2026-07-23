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
      const h = this.interimHabit.config;
      return {
        name: this.habitName,
        type: 'single_select',
        details: {
          options: h.settings.options,
          ...(h.settings.theme ? { theme: h.settings.theme } : {}),
          value: interimHabitValue(this.interimHabit, this.context.data),
        },
        ...(widgets.length > 0 ? { widgets } : {}),
      };
    }

    const h = this.interimHabit.config;
    return {
      name: this.habitName,
      type: 'summation',
      details: {
        goal: h.settings.goal,
        total: interimHabitTotal(this.interimHabit, this.context.data),
        ...(h.settings.summationOptions ? { summationOptions: h.settings.summationOptions } : {}),
      },
      ...(widgets.length > 0 ? { widgets } : {}),
    };
  }
}
