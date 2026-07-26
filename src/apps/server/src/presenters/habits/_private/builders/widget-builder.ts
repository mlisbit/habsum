import type { BarGraphData } from '@habsum/types/common/bar-chart';
import { dayFromString } from '@habsum/types/common/day';
import type { HabitWidget, HabitWidgetInsight } from '@habsum/types/common/habit';
import {
  isDailyStreakFrequency,
  parseStreakFrequencyDays,
  type StreakGraphData,
} from '@habsum/types/common/streak';
import { getDayRangeLabel, getShortDate, getStreakRangeLength, getStreakText } from '../utils.js';
import type { InsightsBuildResult } from './insights/insights-builder.js';

type ProgressOptions = {
  value: number | null;
  goal: number | null;
};

type BarGraphOptions = {
  data: BarGraphData | null;
  goal: number | null;
};

type InsightsOptions = {
  streakInsights: InsightsBuildResult | null;
  includeCurrentStreak: boolean;
  includeLongestStreak: boolean;
  includeWeeklyAverage?: boolean;
  includeAbsentDaysInAverage?: boolean;
  streakFrequency?: string;
};

export class WidgetBuilder {
  private progressOptions?: ProgressOptions;
  private barGraphOptions?: BarGraphOptions;
  private heatmap: StreakGraphData | null = null;
  private insightsOptions?: InsightsOptions;

  withProgress(options: ProgressOptions): this {
    this.progressOptions = options;
    return this;
  }

  withBarGraph(options: BarGraphOptions): this {
    this.barGraphOptions = options;
    return this;
  }

  withHeatmap(heatmap: StreakGraphData | null): this {
    this.heatmap = heatmap;
    return this;
  }

  withInsights(options: InsightsOptions): this {
    this.insightsOptions = options;
    return this;
  }

  build(): HabitWidget[] {
    const widgets: HabitWidget[] = [];
    if (this.progressOptions) widgets.push(this.getProgressWidget(this.progressOptions));

    const historyWidget = this.getHistoryWidget();
    if (historyWidget.body.length > 0) widgets.push(historyWidget);
    return widgets;
  }

  private getProgressWidget({ value, goal }: ProgressOptions): HabitWidget {
    if (goal == null) {
      return {
        title: 'Progress',
        titleValue: value == null ? 'No data' : String(value),
        body: [],
      };
    }
    return {
      title: 'Goal',
      titleValue: `${value == null ? '—' : value} / ${goal}`,
      body: [{ kind: 'progress', value, max: goal }],
    };
  }

  private getHistoryWidget(): HabitWidget {
    const body: HabitWidget['body'] = [];
    const graphData = this.barGraphOptions?.data;
    const goal = this.barGraphOptions?.goal;

    if (graphData) {
      body.push({
        kind: 'barGraph',
        data: graphData,
        ...(goal != null && goal > 0
          ? { lines: [{ value: goal, label: `Daily goal: ${goal}` }] }
          : {}),
      });
    }
    if (this.heatmap) body.push({ kind: 'streakGraph', graph: this.heatmap });

    const insights = this.getInsights(graphData ?? null);
    if (insights.length > 0) body.push({ kind: 'insights', insights });
    return { title: 'History', body };
  }

  private getInsights(graphData: BarGraphData | null): HabitWidgetInsight[] {
    const options = this.insightsOptions;
    if (!options) return [];

    return [
      options.includeCurrentStreak
        ? this.getCurrentStreakInsight(options.streakInsights, options.streakFrequency)
        : null,
      options.includeLongestStreak
        ? this.getLongestStreakInsight(options.streakInsights, options.streakFrequency)
        : null,
      options.includeWeeklyAverage
        ? this.getWeeklyAverageInsight(graphData, options.includeAbsentDaysInAverage ?? false)
        : null,
    ].filter((insight): insight is HabitWidgetInsight => insight != null);
  }

  private getCurrentStreakInsight(
    insights: InsightsBuildResult | null,
    streakFrequency?: string,
  ): HabitWidgetInsight | null {
    if (!insights) return null;
    return {
      header: 'Current streak',
      description: getStreakText(insights.currentStreak, this.isWeeklyStreak(streakFrequency)),
    };
  }

  private getLongestStreakInsight(
    insights: InsightsBuildResult | null,
    streakFrequency?: string,
  ): HabitWidgetInsight | null {
    const longestStreak = insights?.longestStreak;
    if (!longestStreak) return null;

    const weekly = this.isWeeklyStreak(streakFrequency);
    const qualifierOptions = longestStreak.values.join(', ');
    const daysPerWeek = parseStreakFrequencyDays(streakFrequency);
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

  private getWeeklyAverageInsight(
    graphData: BarGraphData | null,
    includeAbsentDays: boolean,
  ): HabitWidgetInsight | null {
    if (!graphData) return null;

    const allValues = Object.values(graphData).map((datum) => datum.value);
    const values = includeAbsentDays
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

  private isWeeklyStreak(streakFrequency?: string): boolean {
    return !isDailyStreakFrequency(parseStreakFrequencyDays(streakFrequency));
  }
}
