// Presents one hydrated single-select habit for a specific viewing date.
import type { Day } from '@habsum/types/common/day';
import {
  isCheckboxThemeCompatible,
  type HabitRowSingleSelect,
  type HabitWidget,
} from '@habsum/types/common/habit';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import { SingleSelectHeatmapBuilder } from './_private/builders/heatmap/single-select-heatmap-builder.js';
import { SingleSelectInsightsBuilder } from './_private/builders/insights/single-select-insights-builder.js';
import { WidgetBuilder } from './_private/builders/widget-builder.js';
import {
  HabitPresenter,
  type HabitHistoryEvent,
  type HabitPresentationContext,
} from './habit-presenter.js';

type HydratedSingleSelectData = Extract<HydratedHabitData, { type: 'single_select' }>;

export class SingleSelectHabitPresenter extends HabitPresenter<
  HabitDef<'single_select'>,
  HydratedSingleSelectData,
  HabitRowSingleSelect
> {
  constructor(
    definition: HabitDef<'single_select'>,
    habitData: HydratedSingleSelectData,
    context: HabitPresentationContext,
  ) {
    super(definition, habitData, context);
  }

  /** Returns the habit data displayed in the calendar view of the history route. */
  getHistoryEvents(startDay: Day, endDay: Day): HabitHistoryEvent[] {
    return this.habitData.values
      .filter((row) => row.date >= startDay && row.date <= endDay)
      .map((row) => ({
        day: row.date,
        habit: this.getPresentedHabit(row.date, false),
      }));
  }

  present(): HabitRowSingleSelect {
    return this.getPresentedHabit(this.context.viewingDate, this.context.includeWidgets ?? false);
  }

  private getPresentedHabit(viewingDate: Day, includeWidgets: boolean): HabitRowSingleSelect {
    const widgets = includeWidgets ? this.getWidgets() : [];
    return {
      name: this.definition.name,
      type: 'single_select',
      details: {
        options: this.definition.settings.options.map(({ label, sentiment }) => ({
          label,
          sentiment,
        })),
        ...(this.definition.settings.theme &&
        isCheckboxThemeCompatible(this.definition.settings.options)
          ? { theme: this.definition.settings.theme }
          : {}),
        value: this.habitData.values.find((row) => row.date === viewingDate)?.value ?? null,
      },
      ...(widgets.length > 0 ? { widgets } : {}),
    };
  }

  private getWidgets(): HabitWidget[] {
    const eligibleOptions = this.definition.settings.options
      .filter((option) => option.sentiment === 'positive')
      .map((option) => option.label);
    const includeHeatmap = this.definition.data_visualization?.heatmap !== undefined;
    const includeCurrentStreak = this.definition.insights.includes('current_streak');
    const includeLongestStreak = this.definition.insights.includes('longest_streak');
    const heatmap = includeHeatmap
      ? new SingleSelectHeatmapBuilder(this.habitData, this.definition, this.context).build({
          eligibleOptions,
        })
      : null;
    const streakInsights =
      (includeCurrentStreak || includeLongestStreak) && this.definition.streak_options
        ? new SingleSelectInsightsBuilder(this.habitData, this.definition, this.context).build({
            eligibleOptions,
            frequency: this.definition.streak_options.frequency,
          })
        : null;

    return new WidgetBuilder()
      .withHeatmap(heatmap)
      .withInsights({
        streakInsights,
        includeCurrentStreak,
        includeLongestStreak,
        streakFrequency: this.definition.streak_options?.frequency,
      })
      .build();
  }
}
