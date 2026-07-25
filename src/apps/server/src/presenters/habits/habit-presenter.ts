// Shared presentation behavior for hydrated, viewing-date-bound habit presenters.
import type { BarGraphData } from '@habsum/types/common/bar-chart';
import { dayFromString, type Day } from '@habsum/types/common/day';
import type { Habit, HabitWidget, HabitWidgetInsight } from '@habsum/types/common/habit';
import {
  isDailyStreakFrequency,
  parseStreakFrequencyDays,
  type StreakGraphData,
} from '@habsum/types/common/streak';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import type { InsightsBuildResult } from './_private/builders/insights/insights-builder.js';
import {
  getDayRangeLabel,
  getShortDate,
  getStreakRangeLength,
  getStreakText,
  type HabitViewOptions,
} from './_private/utils.js';

export type HabitPresentationContext = HabitViewOptions & {
  includeWidgets?: boolean;
  includeEvents?: boolean;
  includeAbsentDaysInAverage?: boolean;
};

export type HabitHistoryEvent = {
  day: Day;
  habit: Habit;
};

type HistoryWidgetOptions = {
  graphData?: BarGraphData | null;
  goal?: number | null;
  heatmap?: StreakGraphData | null;
  streakInsights?: InsightsBuildResult | null;
  includeCurrentStreak: boolean;
  includeLongestStreak: boolean;
};

export abstract class HabitPresenter<
  TDefinition extends HabitDef = HabitDef,
  THabitData extends HydratedHabitData = HydratedHabitData,
  THabit extends Habit = Habit,
> {
  constructor(
    protected readonly definition: TDefinition,
    protected readonly habitData: THabitData,
    protected readonly context: HabitPresentationContext,
  ) {
    if (definition.name !== habitData.name || definition.type !== habitData.type) {
      throw new Error(`hydrated habit type mismatch for "${definition.name}"`);
    }
  }

  /** Returns the habit data displayed in the calendar view of the history route. */
  abstract getHistoryEvents(startDay: Day, endDay: Day): HabitHistoryEvent[];

  abstract present(): THabit;

  protected getHistoryWidget({
    graphData = null,
    goal = null,
    heatmap = null,
    streakInsights = null,
    includeCurrentStreak,
    includeLongestStreak,
  }: HistoryWidgetOptions): HabitWidget {
    const body: HabitWidget['body'] = [];
    const insights = this.getAvailableInsights([
      includeCurrentStreak ? this.getCurrentStreakInsight(streakInsights) : null,
      includeLongestStreak ? this.getLongestStreakInsight(streakInsights) : null,
      this.getWeeklyAverageInsight(graphData),
    ]);

    if (graphData) {
      body.push({
        kind: 'barGraph',
        data: graphData,
        ...(goal != null && goal > 0
          ? { lines: [{ value: goal, label: `Daily goal: ${goal}` }] }
          : {}),
      });
    }
    if (heatmap) body.push({ kind: 'streakGraph', graph: heatmap });
    if (insights.length > 0) body.push({ kind: 'insights', insights });
    return { title: 'History', body };
  }

  private getCurrentStreakInsight(insights: InsightsBuildResult | null): HabitWidgetInsight | null {
    if (!insights) return null;
    return {
      header: 'Current streak',
      description: getStreakText(insights.currentStreak, this.isWeeklyStreak()),
    };
  }

  private getLongestStreakInsight(insights: InsightsBuildResult | null): HabitWidgetInsight | null {
    const longestStreak = insights?.longestStreak;
    if (!longestStreak) return null;

    const weekly = this.isWeeklyStreak();
    const qualifierOptions = longestStreak.values.join(', ');
    const daysPerWeek = parseStreakFrequencyDays(this.definition.streak_options?.frequency);
    const qualifier = qualifierOptions
      ? weekly
        ? `${daysPerWeek}+ per week: ${qualifierOptions}`
        : qualifierOptions
      : '';
    return {
      header: 'Longest streak',
      description: getStreakText(
        getStreakRangeLength([longestStreak.start, longestStreak.end], weekly),
        weekly,
      ),
      hover: [
        getDayRangeLabel(longestStreak.start, longestStreak.end),
        qualifier ? `Includes ${qualifier}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  private getWeeklyAverageInsight(graphData: BarGraphData | null): HabitWidgetInsight | null {
    if (!graphData) return null;

    const allValues = Object.values(graphData).map((datum) => datum.value);
    const values = this.context.includeAbsentDaysInAverage
      ? allValues
      : allValues.filter((value): value is number => value != null);
    const average =
      values.length === 0
        ? null
        : Math.round(values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / values.length);
    const entries = Object.entries(graphData);
    const first = entries.at(0)?.[0];
    const outlined = entries.find(([, datum]) => datum.outline === true)?.[0];
    const end = outlined == null ? 'today' : getShortDate(dayFromString(outlined));
    return {
      header: 'Average/day',
      description: average == null ? '—' : String(average),
      hover: first == null ? 'today' : `${getShortDate(dayFromString(first))} to ${end}`,
    };
  }

  private getAvailableInsights(insights: Array<HabitWidgetInsight | null>): HabitWidgetInsight[] {
    return insights.filter((insight): insight is HabitWidgetInsight => insight != null);
  }

  private isWeeklyStreak(): boolean {
    return !isDailyStreakFrequency(
      parseStreakFrequencyDays(this.definition.streak_options?.frequency),
    );
  }
}
