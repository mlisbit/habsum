import type { BarGraphData } from '@habsum/types/common/bar-chart';
import type { Habit, HabitHistory, HabitWidget } from '@habsum/types/common/habit';

/** Build a 7-day `HabitHistory` for tests from per-day totals (oldest → newest). */
function habitHistoryWeek(
  values: readonly (number | null)[],
  goal: number | null = null,
): HabitHistory {
  const numericForTop = values.filter((v): v is number => v != null);
  const maxValue = numericForTop.length === 0 ? 0 : Math.max(...numericForTop);
  const goalFloor = goal != null && goal > 0 ? goal : 0;
  const top = Math.max(1, maxValue, goalFloor);
  const graphData: BarGraphData = {};
  const keys = [
    '2020-06-08',
    '2020-06-09',
    '2020-06-10',
    '2020-06-11',
    '2020-06-12',
    '2020-06-13',
    '2020-06-14',
  ];
  for (let i = 0; i < values.length; i++) {
    const key = keys[i]!;
    graphData[key] = {
      value: values[i]!,
      top,
      hoverLabel: key,
    };
  }
  return {
    data: { user: { graphData } },
  };
}

function habitHistoryWidget(history: HabitHistory): HabitWidget {
  return {
    title: 'History',
    titleValue: 'avg —',
    body: [{ kind: 'barGraph', data: history.data.user.graphData }],
  };
}

/** Snapshot-ish `HabitsResponse.habits` samples for exercising `getProgress`. */
export const habitsFixtureProgressMixed: readonly Habit[] = [
  {
    name: 'push ups',
    goal: 100,
    widgets: [habitHistoryWidget(habitHistoryWeek([null, null, null, null, null, null, 41], 100))],
    type: 'summation',
    total: 41,
  },
  {
    name: 'alcohol',
    goal: null,
    type: 'single_select',
    options: ['none', 'light', 'moderate', 'heavy'],
    value: 'heavy',
  },
  {
    name: 'pull ups',
    goal: null,
    type: 'summation',
    total: 0,
  },
  {
    name: 'water intake',
    goal: 5,
    widgets: [habitHistoryWidget(habitHistoryWeek([null, null, null, null, null, null, 0], 5))],
    type: 'summation',
    total: 0,
  },
] as const satisfies readonly Habit[];

export const habitsFixtureProgressSecond: readonly Habit[] = [
  {
    name: 'push ups',
    goal: 100,
    widgets: [habitHistoryWidget(habitHistoryWeek([null, null, null, 41, 0, 0, 0], 100))],
    type: 'summation',
    total: 0,
  },
  {
    name: 'alcohol',
    goal: null,
    type: 'single_select',
    options: ['none', 'light', 'moderate', 'heavy'],
    value: 'moderate',
  },
  {
    name: 'pull ups',
    goal: null,
    type: 'summation',
    total: 4,
  },
  {
    name: 'water intake',
    goal: 5,
    widgets: [habitHistoryWidget(habitHistoryWeek([null, null, null, 0, 0, 0, 0], 5))],
    type: 'summation',
    total: 0,
  },
] as const satisfies readonly Habit[];
