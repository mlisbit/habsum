import type { Habit } from '@habsum/api-types';

/** Snapshot-ish `HabitsResponse.habits` samples for exercising `getProgress`. */
export const habitsFixtureProgressMixed: readonly Habit[] = [
  {
    name: 'push ups',
    goal: 100,
    history: {
      display: 'average',
      data: {
        user: [null, null, null, null, null, null, 41],
      },
    },
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
    history: {
      display: 'average',
      data: {
        user: [null, null, null, null, null, null, 0],
      },
    },
    type: 'summation',
    total: 0,
  },
] as const satisfies readonly Habit[];

export const habitsFixtureProgressSecond: readonly Habit[] = [
  {
    name: 'push ups',
    goal: 100,
    history: {
      display: 'average',
      data: {
        user: [null, null, null, 41, 0, 0, 0],
      },
    },
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
    history: {
      display: 'average',
      data: {
        user: [null, null, null, 0, 0, 0, 0],
      },
    },
    type: 'summation',
    total: 0,
  },
] as const satisfies readonly Habit[];
