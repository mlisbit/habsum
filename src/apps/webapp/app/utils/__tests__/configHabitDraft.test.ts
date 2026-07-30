import { describe, expect, it } from 'vitest';
import type { ConfigHabitDraft, UserConfigJson, UserConfigJsonHabit } from '~/api.client';
import { applyHabitDraftToConfig, draftFromHabit } from '../configHabitDraft';

describe('single-select data visualization config', () => {
  it('loads and saves a heatmap history display', () => {
    const habit: UserConfigJsonHabit = {
      name: 'Read',
      type: 'single_select',
      goal: null,
      options: ['yes', 'no'],
      data_visualization: { heatmap: {} },
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
    expect(result.config.habits[0]?.data_visualization).toEqual({ heatmap: {} });
  });
});

describe('text habit config', () => {
  it('keeps only the name, type, repeat schedule, and reset schedule', () => {
    const habit: UserConfigJsonHabit = {
      name: 'Journal',
      type: 'text',
      goal: null,
      reset: ['saturday'],
      data_visualization: { heatmap: {}, bargraph: { period: '3w' } },
      insights: ['current_streak', 'longest_streak'],
      streak_options: { frequency: '7d' },
    };
    const config: UserConfigJson = {
      user: 'writer',
      includeAbsentDaysInAverage: false,
      habits: [habit],
    };

    const draft = draftFromHabit(habit);
    expect(draft.historyEnabled).toBe(false);
    expect(draft.streakShowCurrent).toBe(false);
    expect(draft.reset).toEqual(['saturday']);

    const saved = applyHabitDraftToConfig(config, habit.name, draft).config.habits[0];
    expect(saved).toEqual({
      name: 'Journal',
      type: 'text',
      goal: null,
      reset: ['saturday'],
    });
  });

  it('defaults the reset schedule to every day and omits it when saved', () => {
    const habit: UserConfigJsonHabit = {
      name: 'Journal',
      type: 'text',
      goal: null,
    };
    const config: UserConfigJson = {
      user: 'writer',
      includeAbsentDaysInAverage: false,
      habits: [habit],
    };

    const draft = draftFromHabit(habit);
    expect(draft.reset).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
    expect(
      applyHabitDraftToConfig(config, habit.name, draft).config.habits[0]?.reset,
    ).toBeUndefined();
  });
});

describe('single-select habit theme config', () => {
  it('round-trips the checkbox theme and omits it when unchecked', () => {
    const habit: UserConfigJsonHabit = {
      name: 'Read',
      type: 'single_select',
      goal: null,
      options: ['yes', 'no'],
      theme: 'checkbox',
    };
    const config: UserConfigJson = {
      user: 'reader',
      includeAbsentDaysInAverage: false,
      habits: [habit],
    };
    const draft = draftFromHabit(habit);

    expect(draft.theme).toBe('checkbox');
    expect(applyHabitDraftToConfig(config, habit.name, draft).config.habits[0]?.theme).toBe(
      'checkbox',
    );
    expect(
      applyHabitDraftToConfig(config, habit.name, { ...draft, theme: '' }).config.habits[0]?.theme,
    ).toBeUndefined();
  });
});

describe('habit insight config', () => {
  it('saves the average insight alongside its bar graph period', () => {
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
      historyEnabled: true,
      historyDisplays: ['weekly_history'] as ConfigHabitDraft['historyDisplays'],
    };

    const result = applyHabitDraftToConfig(config, habit.name, draft);

    expect(result.config.habits[0]?.data_visualization).toEqual({
      bargraph: { period: '3w' },
    });
    expect(result.config.habits[0]?.insights).toEqual(['average']);
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

    expect(result.config.habits[0]?.insights).toEqual(['longest_streak']);
    expect(result.config.habits[0]?.streak_options).toEqual({ frequency: '7d' });
  });
});
