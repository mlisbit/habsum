import { describe, expect, it } from 'vitest';
import type { UserConfigJson, UserConfigJsonHabit } from '~/api.client';
import { applyHabitDraftToConfig, draftFromHabit } from '../configHabitDraft';

describe('single-select data visualization config', () => {
  it('loads and saves a heatmap history display', () => {
    const habit: UserConfigJsonHabit = {
      name: 'Read',
      type: 'single_select',
      goal: null,
      options: ['yes', 'no'],
      history: { displays: ['heatmap'], period: '3w' },
    };
    const config: UserConfigJson = {
      user: 'reader',
      includeAbsentDaysInAverage: false,
      habits: [habit],
    };

    const draft = draftFromHabit(habit);
    expect(draft.historyEnabled).toBe(true);
    expect(draft.historyDisplays).toEqual(['heatmap']);

    const result = applyHabitDraftToConfig(config, habit.name, draft);
    expect(result.config.habits[0]?.history).toEqual({
      displays: ['heatmap'],
      period: '3w',
    });
  });
});

describe('habit insight config', () => {
  it('can save an average insight without a weekly-history visualization', () => {
    const habit: UserConfigJsonHabit = {
      name: 'Push ups',
      type: 'summation',
      goal: 100,
    };
    const config: UserConfigJson = {
      user: 'athlete',
      includeAbsentDaysInAverage: false,
      habits: [habit],
    };
    const draft = {
      ...draftFromHabit(habit),
      averageEnabled: true,
      historyEnabled: false,
    };

    const result = applyHabitDraftToConfig(config, habit.name, draft);

    expect(result.config.habits[0]?.history).toEqual({
      displays: [],
      period: '3w',
      show_average: true,
    });
  });

  it('can save the longest streak without showing the current streak', () => {
    const habit: UserConfigJsonHabit = {
      name: 'Push ups',
      type: 'summation',
      goal: 100,
    };
    const config: UserConfigJson = {
      user: 'athlete',
      includeAbsentDaysInAverage: false,
      habits: [habit],
    };
    const draft = {
      ...draftFromHabit(habit),
      streakShowCurrent: false,
      streakShowLongest: true,
    };

    const result = applyHabitDraftToConfig(config, habit.name, draft);

    expect(result.config.habits[0]?.streak).toEqual({
      options: ['100'],
      show_current: false,
      show_longest: true,
    });
  });
});
