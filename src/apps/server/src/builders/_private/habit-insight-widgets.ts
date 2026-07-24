// Builds habit widgets and insight visuals from hydrated data plus its configured definition.
import type { HabitWidget } from '@habsum/types/common/habit';
import type {
  HabitDataReader,
  HabitDataSnapshot,
  HydratedHabitData,
} from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import { habitHistoryForConfiguredPeriod } from '../../utils/habits/history-utils.js';
import {
  streakGraphForConfiguredWindow,
  summationStreakGraphForConfiguredWindow,
} from '../../utils/habits/streak-utils.js';
import { habitWidgets, historyWidget, progressWidget } from '../../utils/habits/widget-utils.js';

type HabitInsightWidgetInput = {
  data: HabitDataSnapshot;
  definition: HabitDef;
  habitData: HydratedHabitData;
  includeAbsentDaysInAverage: boolean;
  at: Date;
  tzOffsetMinutes?: number;
  includeBarGraph?: boolean;
  includeHeatMap?: boolean;
  includeCurrentStreakInsight?: boolean;
  includeLongestStreakInsight?: boolean;
  includeWeeklyAverageInsight?: boolean;
};

function readerForHydratedHabit(habitData: HydratedHabitData): HabitDataReader {
  return {
    getSelect(_user, habit, date) {
      if (habitData.type !== 'single_select' || habitData.name !== habit) return null;
      return habitData.values.find((row) => row.date === date)?.value ?? null;
    },
    getFirstSelectDate(_user, habit) {
      if (habitData.type !== 'single_select' || habitData.name !== habit) return null;
      if (habitData.values.length === 0) return null;
      return habitData.values.reduce(
        (min, row) => (row.date < min ? row.date : min),
        habitData.values[0]!.date,
      );
    },
    getSeries(_user, habit, startDate, endDate) {
      if (habitData.type !== 'summation' || habitData.name !== habit) return [];
      return habitData.totals.filter((row) => row.date >= startDate && row.date <= endDate);
    },
  };
}

export function selectedValueForViewDate(
  habitData: HydratedHabitData,
  data: HabitDataSnapshot,
): string | null {
  if (habitData.type !== 'single_select') return null;
  return habitData.values.find((row) => row.date === data.viewDate)?.value ?? null;
}

export function summationTotalForViewDate(
  habitData: HydratedHabitData,
  data: HabitDataSnapshot,
): number | null {
  if (habitData.type !== 'summation') return null;
  return habitData.totals.find((row) => row.date === data.viewDate)?.total ?? null;
}

export function buildHabitWidgets({
  data,
  definition,
  habitData,
  includeAbsentDaysInAverage,
  at,
  tzOffsetMinutes,
  includeBarGraph = false,
  includeHeatMap = false,
  includeCurrentStreakInsight = false,
  includeLongestStreakInsight = false,
  includeWeeklyAverageInsight = false,
}: HabitInsightWidgetInput): HabitWidget[] {
  const reader = readerForHydratedHabit(habitData);

  if (habitData.type === 'single_select' && definition.type === 'single_select') {
    const h = definition;
    const heatmap = includeHeatMap
      ? streakGraphForConfiguredWindow(
          data.user,
          h.name,
          data.viewDate,
          h.streak_options?.options ?? [],
          at,
          tzOffsetMinutes,
          undefined,
          false,
          data.firstRecordedDate,
          h.settings.options,
          reader,
        )
      : null;
    const streak =
      (includeCurrentStreakInsight || includeLongestStreakInsight) && h.streak_options
        ? streakGraphForConfiguredWindow(
            data.user,
            h.name,
            data.viewDate,
            h.streak_options.options,
            at,
            tzOffsetMinutes,
            h.streak_options.frequency,
            includeLongestStreakInsight,
            data.firstRecordedDate,
            h.settings.options,
            reader,
          )
        : null;

    return habitWidgets([
      heatmap || streak
        ? historyWidget(null, null, false, heatmap, streak, includeCurrentStreakInsight)
        : null,
    ]);
  }

  if (habitData.type !== 'summation' || definition.type !== 'summation') {
    throw new Error(`hydrated habit type mismatch for "${definition.name}"`);
  }

  const h = definition;
  const total = summationTotalForViewDate(habitData, data);
  const history =
    h.data_visualization?.bargraph != null && (includeBarGraph || includeWeeklyAverageInsight)
      ? habitHistoryForConfiguredPeriod(
          data.user,
          h.name,
          data.viewDate,
          data.firstRecordedDate,
          h.data_visualization.bargraph.period,
          h.settings.goal,
          at,
          tzOffsetMinutes,
          reader,
        )
      : null;
  const heatmap =
    includeHeatMap && h.settings.goal != null
      ? summationStreakGraphForConfiguredWindow(
          data.user,
          h.name,
          data.viewDate,
          [String(h.settings.goal)],
          at,
          tzOffsetMinutes,
          undefined,
          false,
          data.firstRecordedDate,
          reader,
        )
      : null;
  const streak =
    (includeCurrentStreakInsight || includeLongestStreakInsight) && h.streak_options
      ? summationStreakGraphForConfiguredWindow(
          data.user,
          h.name,
          data.viewDate,
          h.streak_options.options,
          at,
          tzOffsetMinutes,
          h.streak_options.frequency,
          includeLongestStreakInsight,
          data.firstRecordedDate,
          reader,
        )
      : null;

  return habitWidgets([
    progressWidget(total, h.settings.goal),
    history || heatmap || streak
      ? historyWidget(
          history,
          h.settings.goal,
          includeAbsentDaysInAverage,
          heatmap,
          streak,
          includeCurrentStreakInsight,
          includeBarGraph,
        )
      : null,
  ]);
}
