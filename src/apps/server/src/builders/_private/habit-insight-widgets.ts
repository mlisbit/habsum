// Builds habit widgets and insight visuals from a full interim habit.
import type { HabitWidget } from '@habsum/types/common/habit';
import type { HabitDataReader, InterimHabit, InterimHabitsData } from '../../types/habit.types.js';
import { habitHistoryForConfiguredPeriod } from '../../utils/habits/history-utils.js';
import {
  streakGraphForConfiguredWindow,
  summationStreakGraphForConfiguredWindow,
} from '../../utils/habits/streak-utils.js';
import { habitWidgets, historyWidget, progressWidget } from '../../utils/habits/widget-utils.js';

type HabitInsightWidgetInput = {
  data: InterimHabitsData;
  habit: InterimHabit;
  at: Date;
  tzOffsetMinutes?: number;
  includeBarGraph?: boolean;
  includeHeatMap?: boolean;
  includeCurrentStreakInsight?: boolean;
  includeLongestStreakInsight?: boolean;
  includeWeeklyAverageInsight?: boolean;
};

function readerForInterimHabit(interimHabit: InterimHabit): HabitDataReader {
  return {
    getSelect(_user, habit, date) {
      if (interimHabit.type !== 'single_select' || interimHabit.config.name !== habit) return null;
      return interimHabit.values.find((row) => row.date === date)?.value ?? null;
    },
    getFirstSelectDate(_user, habit) {
      if (interimHabit.type !== 'single_select' || interimHabit.config.name !== habit) return null;
      if (interimHabit.values.length === 0) return null;
      return interimHabit.values.reduce(
        (min, row) => (row.date < min ? row.date : min),
        interimHabit.values[0]!.date,
      );
    },
    getSeries(_user, habit, startDate, endDate) {
      if (interimHabit.type !== 'summation' || interimHabit.config.name !== habit) return [];
      return interimHabit.totals.filter((row) => row.date >= startDate && row.date <= endDate);
    },
  };
}

export function interimHabitValue(
  interimHabit: InterimHabit,
  data: InterimHabitsData,
): string | null {
  if (interimHabit.type !== 'single_select') return null;
  return interimHabit.values.find((row) => row.date === data.date)?.value ?? null;
}

export function interimHabitTotal(
  interimHabit: InterimHabit,
  data: InterimHabitsData,
): number | null {
  if (interimHabit.type !== 'summation') return null;
  return interimHabit.totals.find((row) => row.date === data.date)?.total ?? null;
}

export function buildHabitWidgets({
  data,
  habit: interimHabit,
  at,
  tzOffsetMinutes,
  includeBarGraph = false,
  includeHeatMap = false,
  includeCurrentStreakInsight = false,
  includeLongestStreakInsight = false,
  includeWeeklyAverageInsight = false,
}: HabitInsightWidgetInput): HabitWidget[] {
  const h = interimHabit.config;
  const reader = readerForInterimHabit(interimHabit);

  if (interimHabit.type === 'single_select') {
    const heatmap = includeHeatMap
      ? streakGraphForConfiguredWindow(
          data.user,
          h.name,
          data.date,
          h.streak?.options ?? [],
          at,
          tzOffsetMinutes,
          undefined,
          false,
          data.firstDate,
          h.options ?? [],
          reader,
        )
      : null;
    const streak =
      (includeCurrentStreakInsight || includeLongestStreakInsight) && h.streak
        ? streakGraphForConfiguredWindow(
            data.user,
            h.name,
            data.date,
            h.streak.options,
            at,
            tzOffsetMinutes,
            h.streak.frequency,
            includeLongestStreakInsight,
            data.firstDate,
            h.options ?? [],
            reader,
          )
        : null;

    return habitWidgets([
      heatmap || streak
        ? historyWidget(null, h.goal, false, heatmap, streak, includeCurrentStreakInsight)
        : null,
    ]);
  }

  const total = interimHabitTotal(interimHabit, data);
  const history =
    h.history != null && (includeBarGraph || includeWeeklyAverageInsight)
      ? habitHistoryForConfiguredPeriod(
          data.user,
          h.name,
          data.date,
          data.firstDate,
          h.history.period,
          h.goal,
          at,
          tzOffsetMinutes,
          reader,
        )
      : null;
  const heatmap =
    includeHeatMap && h.goal != null
      ? summationStreakGraphForConfiguredWindow(
          data.user,
          h.name,
          data.date,
          [String(h.goal)],
          at,
          tzOffsetMinutes,
          undefined,
          false,
          data.firstDate,
          reader,
        )
      : null;
  const streak =
    (includeCurrentStreakInsight || includeLongestStreakInsight) && h.streak
      ? summationStreakGraphForConfiguredWindow(
          data.user,
          h.name,
          data.date,
          h.streak.options,
          at,
          tzOffsetMinutes,
          h.streak.frequency,
          includeLongestStreakInsight,
          data.firstDate,
          reader,
        )
      : null;

  return habitWidgets([
    progressWidget(total, h.goal),
    history || heatmap || streak
      ? historyWidget(
          history,
          h.goal,
          data.config.includeAbsentDaysInAverage,
          heatmap,
          streak,
          includeCurrentStreakInsight,
          includeBarGraph,
        )
      : null,
  ]);
}
