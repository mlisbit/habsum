import { describe, expect, it } from 'vitest';

import { PROGRESS_TOTAL_SCALE, getProgress } from '../habit-helpers';
import {
  habitsFixtureProgressMixed,
  habitsFixtureProgressSecond,
} from './fixtures/habits-for-get-progress';

describe('getProgress', () => {
  it('returns goals / other aggregates and weighted bar fraction for Habits fixtures', () => {
    expect(getProgress([...habitsFixtureProgressMixed])).toEqual({
      goals: { done: 41, total: 105 },
      other: { done: 1, total: 2 },
      total: { done: 2640, total: PROGRESS_TOTAL_SCALE },
    });

    expect(getProgress([...habitsFixtureProgressSecond])).toEqual({
      goals: { done: 0, total: 105 },
      other: { done: 2, total: 2 },
      total: { done: 2000, total: PROGRESS_TOTAL_SCALE },
    });
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
