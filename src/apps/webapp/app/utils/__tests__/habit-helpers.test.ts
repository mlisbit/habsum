import { describe, expect, it } from 'vitest';
import { isHabitComplete } from '@habsum/utils/habit-helpers';

import { PROGRESS_TOTAL_SCALE, getProgress } from '../habit-helpers';
import {
  habitsFixtureProgressMixed,
  habitsFixtureProgressSecond,
} from './fixtures/habits-for-get-progress';

describe('getProgress', () => {
  it('returns goals / other aggregates with an equal share per habit in the progress bar', () => {
    expect(getProgress([...habitsFixtureProgressMixed])).toEqual({
      goals: { done: 41, total: 105 },
      other: { done: 2, total: 2 },
      total: { done: 6025, total: PROGRESS_TOTAL_SCALE },
    });

    expect(getProgress([...habitsFixtureProgressSecond])).toEqual({
      goals: { done: 0, total: 105 },
      other: { done: 2, total: 2 },
      total: { done: 5000, total: PROGRESS_TOTAL_SCALE },
    });
  });

  it.each([
    { total: null, expected: 7500 },
    { total: 0, expected: 7500 },
    { total: 50, expected: 8750 },
    { total: 100, expected: 10000 },
    { total: 150, expected: 10000 },
    { total: -10, expected: 7500 },
  ])(
    'gives three completed habits 75% plus the fourth goal’s share when its total is $total',
    ({ total, expected }) => {
      const progress = getProgress([
        { name: 'Push ups', type: 'summation', details: { goal: 100, total } },
        {
          name: 'Reading',
          type: 'single_select',
          details: { options: ['None', 'A bit', 'A lot'], value: 'A bit' },
        },
        { name: 'Journal', type: 'text', details: { text: 'A thought.' } },
        {
          name: 'Take Multivitamin',
          type: 'single_select',
          details: { options: ['yes'], theme: 'checkbox', value: 'yes' },
        },
      ]);

      expect(progress.total).toEqual({ done: expected, total: PROGRESS_TOTAL_SCALE });
    },
  );

  it('returns no progress when there are no habits', () => {
    expect(getProgress([])).toEqual({
      goals: { done: 0, total: 0 },
      other: { done: 0, total: 0 },
      total: { done: 0, total: 0 },
    });
  });

  it.each([0, -1, 1])(
    'counts recorded total %s as complete for a habit without a goal',
    (total) => {
      const habit = { name: 'Count', type: 'summation' as const, details: { goal: null, total } };
      expect(isHabitComplete(habit)).toBe(true);
      expect(getProgress([habit]).total.done).toBe(PROGRESS_TOTAL_SCALE);
    },
  );

  it('only counts a numeric goal as complete when its target is reached', () => {
    for (const [total, completed] of [
      [0, false],
      [50, false],
      [100, true],
      [150, true],
    ] as const) {
      expect(
        isHabitComplete({ name: 'Goal', type: 'summation', details: { goal: 100, total } }),
      ).toBe(completed);
    }
    expect(
      isHabitComplete({ name: 'Count', type: 'summation', details: { goal: null, total: null } }),
    ).toBe(false);
    expect(
      isHabitComplete({
        name: 'Choice',
        type: 'single_select',
        details: { options: ['yes'], value: '' },
      }),
    ).toBe(false);
  });

  it('counts a non-empty text entry as a completed non-goal habit', () => {
    expect(
      getProgress([
        {
          name: 'Journal',
          type: 'text',
          details: { text: 'A thought.' },
        },
        {
          name: 'Notes',
          type: 'text',
          details: { text: null },
        },
      ]),
    ).toEqual({
      goals: { done: 0, total: 0 },
      other: { done: 1, total: 2 },
      total: { done: 5000, total: PROGRESS_TOTAL_SCALE },
    });
  });
});
