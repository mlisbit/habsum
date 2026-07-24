// Presents one hydrated summation habit for a specific viewing date.
import type { BarGraphData } from '@habsum/types/common/bar-chart';
import type { Day } from '@habsum/types/common/day';
import type { HabitHistory, HabitRowSummation, HabitWidget } from '@habsum/types/common/habit';
import { fromDateKey, toDateKey } from '@habsum/utils/date';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import { getApiSummationEvents } from '../../utils/summation-event-utils.js';
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

  getRecordedDates(): Day[] {
    return this.habitData.totals.map((row) => row.date);
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
    const history = includeBarGraph || includeWeeklyAverage ? this.getHistory() : null;
    const heatmap =
      includeHeatmap && this.definition.settings.goal != null
        ? this.getStreakGraph({
            eligibleOptions: [String(this.definition.settings.goal)],
          })
        : null;
    const streak =
      (includeCurrentStreak || includeLongestStreak) && this.definition.streak_options
        ? this.getStreakGraph({
            eligibleOptions: this.definition.streak_options.options,
            frequency: this.definition.streak_options.frequency,
            includeLongest: includeLongestStreak,
          })
        : null;
    const widgets: HabitWidget[] = [this.getProgressWidget(total)];

    if (history || heatmap || streak) {
      widgets.push(
        this.getHistoryWidget({
          history,
          goal: this.definition.settings.goal,
          heatmap,
          streak,
          includeCurrentStreak,
          includeBarGraph,
        }),
      );
    }
    return widgets;
  }

  private getProgressWidget(total: number | null): HabitWidget {
    const goal = this.definition.settings.goal;
    if (goal == null) {
      return {
        title: 'Progress',
        titleValue: total == null ? 'No data' : String(total),
        body: [],
      };
    }
    return {
      title: 'Goal',
      titleValue: `${total == null ? '—' : total} / ${goal}`,
      body: [{ kind: 'progress', value: total, max: goal }],
    };
  }

  private getHistory(): HabitHistory | null {
    const period = this.definition.data_visualization?.bargraph?.period;
    if (!period) return null;
    const days = this.getPeriodDays(period) ?? 7;
    const end = this.addHistoryDays(
      this.context.viewingDate,
      this.getHistoryGraphRightPaddingDays(),
    );
    const start = this.addHistoryDays(end, -(days - 1));
    const outlineViewDate = this.context.viewingDate !== this.context.today;
    const totalsByDate = new Map(
      this.habitData.totals
        .filter((row) => row.date >= start && row.date <= end)
        .map((row) => [row.date, row.total]),
    );
    const values = Array.from({ length: days }, (_, index) => {
      const date = this.addHistoryDays(start, index);
      return totalsByDate.get(date) ?? null;
    });
    const top = Math.max(
      1,
      ...values.filter((value): value is number => value != null),
      this.definition.settings.goal != null && this.definition.settings.goal > 0
        ? this.definition.settings.goal
        : 0,
    );
    const graphData: BarGraphData = {};
    for (let index = 0; index < days; index++) {
      const date = this.addHistoryDays(start, index);
      graphData[date] = {
        value: values[index]!,
        top,
        hoverLabel: this.getBarGraphDayLabel(date),
        ...(outlineViewDate && date === this.context.viewingDate ? { outline: true } : {}),
        ...(outlineViewDate && date > this.context.viewingDate ? { dimmed: true } : {}),
      };
    }
    return { data: { user: { graphData } } };
  }

  private getPeriodDays(period: string): number | null {
    const match = period.match(/^(\d+)([dw])$/);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return match[2] === 'w' ? amount * 7 : amount;
  }

  private getHistoryGraphRightPaddingDays(): number {
    if (this.context.viewingDate >= this.context.today) return 0;
    const difference = Math.round(
      (fromDateKey(this.context.today, 0).getTime() -
        fromDateKey(this.context.viewingDate, 0).getTime()) /
        86_400_000,
    );
    return Number.isFinite(difference) && difference > 0 ? Math.min(3, difference) : 0;
  }

  private addHistoryDays(date: Day, delta: number): Day {
    const next = new Date(fromDateKey(date, 0).getTime() + delta * 86_400_000);
    return toDateKey(next, 0);
  }

  private getBarGraphDayLabel(date: Day): string {
    const [yearText, monthText, dayText] = date.split('-');
    const parsed = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}
