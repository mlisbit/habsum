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
