// Habit widget render-model assembly from graph and insight results.
import type { HabitHistory, HabitWidget, HabitWidgetInsight } from '@habsum/types/common/habit';
import type { StreakGraphData } from '@habsum/types/common/streak';
import { currentStreakInsight } from './insights/current-streak-insight.js';
import { longestStreakInsight } from './insights/longest-streak-insight.js';
import { weeklyAverageInsight } from './insights/weekly-average-insight.js';
import type { StreakGraphWithText } from './streak-utils.js';

/** Removes presentation-only streak text before embedding the graph in a widget body. */
function streakGraphData(streak: StreakGraphWithText): StreakGraphData {
  const { currentText: _omit, ...graph } = streak;
  return graph;
}

/** Drops unavailable insight results while preserving their display order. */
function compactInsights(insights: Array<HabitWidgetInsight | null>): HabitWidgetInsight[] {
  return insights.filter((insight): insight is HabitWidgetInsight => insight != null);
}

/** Builds the progress or goal widget for a summation habit. */
export function progressWidget(total: number | null, goal: number | null): HabitWidget | null {
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

/** Combines averages, streak insights, bar history, and a heatmap into one history widget. */
export function historyWidget(
  history: HabitHistory | null,
  goal: number | null | undefined,
  includeAbsentDaysInAverage = false,
  heatmap: StreakGraphWithText | null = null,
  streak: StreakGraphWithText | null = null,
): HabitWidget {
  const body: HabitWidget['body'] = [];
  const insights = compactInsights([
    currentStreakInsight(streak),
    longestStreakInsight(streak),
    weeklyAverageInsight(history, includeAbsentDaysInAverage),
  ]);
  if (insights.length > 0) body.push({ kind: 'insights', insights });
  if (history) {
    body.push({
      kind: 'barGraph',
      data: history.data.user.graphData,
      ...(goal != null && goal > 0
        ? { lines: [{ value: goal, label: `Daily goal: ${goal}` }] }
        : {}),
    });
  }
  if (heatmap) body.push({ kind: 'streakGraph', graph: streakGraphData(heatmap) });
  return { title: 'History', body };
}

/** Removes absent widgets from a configured widget list. */
export function habitWidgets(widgets: Array<HabitWidget | null | undefined>): HabitWidget[] {
  return widgets.filter((widget): widget is HabitWidget => widget != null);
}
