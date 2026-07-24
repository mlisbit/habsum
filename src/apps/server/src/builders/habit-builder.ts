// Builds one API habit row from hydrated data and selected presentation options.
import type { Habit } from '@habsum/types/common/habit';
import type { HydratedHabitData, HabitDataSnapshot } from '../types/habit.types.js';
import type { HabitDef, UserConfig } from '../types/userConfig.js';
import getHabitWidgets, {
  getSelectedValueForViewDate,
  getSummationTotalForViewDate,
} from '../utils/habits/get-habit-widgets.js';

export type HabitInsightKind = 'weeklyAverage' | 'currentStreak' | 'longestStreak';

type HabitBuilderContext = {
  data: HabitDataSnapshot;
  at: Date;
  tzOffsetMinutes?: number;
};

export class HabitBuilder {
  private readonly insights = new Set<HabitInsightKind>();
  private includeHeatMap = false;
  private includeBarGraph = false;

  constructor(
    private readonly definition: HabitDef,
    private readonly config: UserConfig,
    private readonly habitData: HydratedHabitData,
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
    const widgets = getHabitWidgets(this.habitData, {
      data: this.context.data,
      definition: this.definition,
      includeAbsentDaysInAverage: this.config.includeAbsentDaysInAverage,
      at: this.context.at,
      tzOffsetMinutes: this.context.tzOffsetMinutes,
      includeBarGraph: this.includeBarGraph,
      includeHeatMap: this.includeHeatMap,
      includeCurrentStreakInsight: this.insights.has('currentStreak'),
      includeLongestStreakInsight: this.insights.has('longestStreak'),
      includeWeeklyAverageInsight: this.insights.has('weeklyAverage'),
    });

    if (this.habitData.type === 'single_select' && this.definition.type === 'single_select') {
      const h = this.definition;
      return {
        name: h.name,
        type: 'single_select',
        details: {
          options: h.settings.options,
          ...(h.settings.theme ? { theme: h.settings.theme } : {}),
          value: getSelectedValueForViewDate(this.habitData, this.context.data),
        },
        ...(widgets.length > 0 ? { widgets } : {}),
      };
    }

    if (this.habitData.type !== 'summation' || this.definition.type !== 'summation') {
      throw new Error(`hydrated habit type mismatch for "${this.definition.name}"`);
    }

    const h = this.definition;
    return {
      name: h.name,
      type: 'summation',
      details: {
        goal: h.settings.goal,
        total: getSummationTotalForViewDate(this.habitData, this.context.data),
        ...(h.settings.summationOptions ? { summationOptions: h.settings.summationOptions } : {}),
      },
      ...(widgets.length > 0 ? { widgets } : {}),
    };
  }
}
