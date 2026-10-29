// Presents one hydrated summation habit for a specific viewing date.
import type { Day } from '@habsum/types/common/day';
import type { HabitRowSummation, HabitWidget } from '@habsum/types/common/habit';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import { getApiSummationEvents } from '../../utils/summation-event-utils.js';
import { SummationGraphBuilder } from './_private/builders/graph/summation-graph-builder.js';
import { SummationHeatmapBuilder } from './_private/builders/heatmap/summation-heatmap-builder.js';
import { SummationInsightsBuilder } from './_private/builders/insights/summation-insights-builder.js';
import { WidgetBuilder } from './_private/builders/widget-builder.js';
import {
  HabitPresenter,
  type HabitHistoryEvent,
  type HabitPresentationContext,
} from './habit-presenter.js';

type HydratedSummationData = Extract<HydratedHabitData, { type: 'summation' }>;

type PresentSummationHabitOptions = {
  includeEvents?: boolean;
  includeWidgets?: boolean;
};

export class SummationHabitPresenter extends HabitPresenter<
  HabitDef<'summation'>,
  HydratedSummationData,
  HabitRowSummation
> {
  constructor(
    definition: HabitDef<'summation'>,
    habitData: HydratedSummationData,
    context: HabitPresentationContext,
  ) {
    super(definition, habitData, context);
  }

  /** Returns the habit data displayed in the calendar view of the history route. */
  getHistoryEvents(startDay: Day, endDay: Day): HabitHistoryEvent[] {
    return this.habitData.totals
      .filter((row) => row.date >= startDay && row.date <= endDay)
      .map((row) => ({
        day: row.date,
        habit: this.getPresentedHabit(row.date, {
          includeEvents: true,
        }),
      }));
  }

  present(): HabitRowSummation {
    return this.getPresentedHabit(this.context.viewingDate, {
      includeEvents: this.context.includeEvents,
      includeWidgets: this.context.includeWidgets,
    });
  }

  private getPresentedHabit(
    viewingDate: Day,
    { includeEvents = false, includeWidgets = false }: PresentSummationHabitOptions = {},
  ): HabitRowSummation {
    const total = this.habitData.totals.find((row) => row.date === viewingDate)?.total ?? null;
    const widgets = includeWidgets ? this.getWidgets(total) : [];
    return {
      name: this.definition.name,
      type: 'summation',
      details: {
        goal: this.definition.settings.goal,
        total,
        ...(includeEvents
          ? {
              events: getApiSummationEvents(
                this.habitData.events.filter((event) => event.date === viewingDate),
              ),
            }
          : {}),
        ...(this.definition.settings.summationOptions
          ? {
              summationOptions: this.definition.settings.summationOptions,
            }
          : {}),
      },
      ...(widgets.length > 0 ? { widgets } : {}),
    };
  }

  private getWidgets(total: number | null): HabitWidget[] {
    const includeBarGraph = this.definition.data_visualization?.bargraph != null;
    const includeHeatmap = this.definition.data_visualization?.heatmap !== undefined;
    const includeCurrentStreak = this.definition.insights.includes('current_streak');
    const includeLongestStreak = this.definition.insights.includes('longest_streak');
    const includeWeeklyAverage = this.definition.insights.includes('average');
    const graphData =
      includeBarGraph || includeWeeklyAverage
        ? new SummationGraphBuilder(this.habitData, this.definition, this.context).build()
        : null;
    const heatmap =
      includeHeatmap && this.definition.settings.goal != null
        ? new SummationHeatmapBuilder(this.habitData, this.definition, this.context).build({
            eligibleOptions: [String(this.definition.settings.goal)],
          })
        : null;
    const streakInsights =
      (includeCurrentStreak || includeLongestStreak) && this.definition.streak_options
        ? new SummationInsightsBuilder(this.habitData, this.definition, this.context).build({
            eligibleOptions:
              this.definition.settings.goal == null ? [] : [String(this.definition.settings.goal)],
            frequency: this.definition.streak_options.frequency,
          })
        : null;
    return new WidgetBuilder()
      .withProgress({
        value: total,
        goal: this.definition.settings.goal,
      })
      .withBarGraph({
        data: graphData,
        goal: this.definition.settings.goal,
      })
      .withHeatmap(heatmap)
      .withInsights({
        streakInsights,
        includeCurrentStreak,
        includeLongestStreak,
        includeWeeklyAverage,
        includeAbsentDaysInAverage: this.context.includeAbsentDaysInAverage,
        streakFrequency: this.definition.streak_options?.frequency,
      })
      .build();
  }
}
