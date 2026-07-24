// Presents one hydrated single-select habit for a specific viewing date.
import type { Day } from '@habsum/types/common/day';
import type { HabitRowSingleSelect, HabitWidget } from '@habsum/types/common/habit';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
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

  getRecordedDates(): Day[] {
    return this.habitData.values.map((row) => row.date);
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
        options: this.definition.settings.options,
        ...(this.definition.settings.theme ? { theme: this.definition.settings.theme } : {}),
        value: this.habitData.values.find((row) => row.date === viewingDate)?.value ?? null,
      },
      ...(widgets.length > 0 ? { widgets } : {}),
    };
  }

  private getWidgets(): HabitWidget[] {
    const includeHeatmap = this.definition.data_visualization?.heatmap !== undefined;
    const includeCurrentStreak = this.definition.insights.includes('current_streak');
    const includeLongestStreak = this.definition.insights.includes('longest_streak');
    const heatmap = includeHeatmap
      ? this.getStreakGraph({
          eligibleOptions: this.definition.streak_options?.options ?? [],
          selectableValues: this.definition.settings.options,
        })
      : null;
    const streak =
      (includeCurrentStreak || includeLongestStreak) && this.definition.streak_options
        ? this.getStreakGraph({
            eligibleOptions: this.definition.streak_options.options,
            frequency: this.definition.streak_options.frequency,
            includeLongest: includeLongestStreak,
            selectableValues: this.definition.settings.options,
          })
        : null;

    if (!heatmap && !streak) return [];
    return [
      this.getHistoryWidget({
        heatmap,
        streak,
        includeCurrentStreak,
        includeBarGraph: false,
      }),
    ];
  }
}
