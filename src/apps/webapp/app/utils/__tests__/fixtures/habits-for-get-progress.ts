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
    titleValue: '—/day average over last 1 week',
    titleValueHoverText: 'Average excludes days with no data and uses days with logged data.',
    body: [{ kind: 'barGraph', data: history.data.user.graphData }],
  };
}

/** Snapshot-ish `HabitsResponse.habits` samples for exercising `getProgress`. */
export const habitsFixtureProgressMixed: readonly Habit[] = [
  {
    name: 'push ups',
    widgets: [habitHistoryWidget(habitHistoryWeek([null, null, null, null, null, null, 41], 100))],
    type: 'summation',
    details: { goal: 100, total: 41 },
  },
  {
    name: 'alcohol',
    type: 'single_select',
    details: {
      options: [
        { label: 'none', sentiment: 'positive' },
        { label: 'light', sentiment: 'positive' },
        { label: 'moderate', sentiment: 'positive' },
        { label: 'heavy', sentiment: 'positive' },
      ],
      value: 'heavy',
    },
  },
  {
    name: 'pull ups',
    type: 'summation',
    details: { goal: null, total: 0 },
  },
  {
    name: 'water intake',
    widgets: [habitHistoryWidget(habitHistoryWeek([null, null, null, null, null, null, 0], 5))],
    type: 'summation',
    details: { goal: 5, total: 0 },
  },
] as const satisfies readonly Habit[];

export const habitsFixtureProgressSecond: readonly Habit[] = [
  {
    name: 'push ups',
    widgets: [habitHistoryWidget(habitHistoryWeek([null, null, null, 41, 0, 0, 0], 100))],
    type: 'summation',
    details: { goal: 100, total: 0 },
  },
  {
    name: 'alcohol',
    type: 'single_select',
    details: {
      options: [
        { label: 'none', sentiment: 'positive' },
        { label: 'light', sentiment: 'positive' },
        { label: 'moderate', sentiment: 'positive' },
        { label: 'heavy', sentiment: 'positive' },
      ],
      value: 'moderate',
    },
  },
  {
    name: 'pull ups',
    type: 'summation',
    details: { goal: null, total: 4 },
  },
  {
    name: 'water intake',
    widgets: [habitHistoryWidget(habitHistoryWeek([null, null, null, 0, 0, 0, 0], 5))],
    type: 'summation',
    details: { goal: 5, total: 0 },
  },
] as const satisfies readonly Habit[];
