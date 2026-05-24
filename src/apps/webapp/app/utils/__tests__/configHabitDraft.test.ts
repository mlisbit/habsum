import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';

import {
  applyHabitDraftToConfigYaml,
  formatHistoryPeriod,
  parseHabitDraftFromText,
  parseHistoryPeriod,
  removeHabitFromConfigYaml,
  sortQuickAddItems,
  type ConfigHabitDraft,
  addHabitToConfigYaml,
} from '../configHabitDraft';

const SAMPLE = `habits:
  push ups:
    type: summation
    goal: 100
    summation_options: [1, 10]
  soda:
    type: single_select
    options: [none, light]
    streak:
      options: [none]
    history:
      period: 2w
`;

describe('sortQuickAddItems', () => {
  it('sorts numerically ascending', () => {
    expect(sortQuickAddItems(['10', '5', '-1'])).toEqual(['-1', '5', '10']);
    expect(sortQuickAddItems(['3', '1'])).toEqual(['1', '3']);
  });
});

describe('parseHistoryPeriod', () => {
  it('parses weeks and days', () => {
    expect(parseHistoryPeriod('2w')).toEqual({ amount: '2', unit: 'w' });
    expect(parseHistoryPeriod('14d')).toEqual({ amount: '14', unit: 'd' });
  });

  it('defaults invalid values to 1 week', () => {
    expect(parseHistoryPeriod('')).toEqual({ amount: '1', unit: 'w' });
    expect(parseHistoryPeriod('bad')).toEqual({ amount: '1', unit: 'w' });
  });
});

describe('formatHistoryPeriod', () => {
  it('serializes amount and unit', () => {
    expect(formatHistoryPeriod('4', 'w')).toBe('4w');
    expect(formatHistoryPeriod('10', 'd')).toBe('10d');
  });
});

describe('summation_options parsing', () => {
  it('strips legacy input marker from yaml arrays', () => {
    const yamlText = `habits:
  test:
    type: summation
    summation_options: [1, input, 10]
`;
    const draft = parseHabitDraftFromText(yamlText, 'test');
    expect(draft.quickAddItems).toEqual(['1', '10']);
    const out = applyHabitDraftToConfigYaml(yamlText, draft, 'test');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits.test).toMatchObject({ summation_options: [1, 10] });
  });

  it('sorts quick-add items when loading from yaml', () => {
    const yamlText = `habits:
  test:
    type: summation
    summation_options: [10, -1, 5]
`;
    const draft = parseHabitDraftFromText(yamlText, 'test');
    expect(draft.quickAddItems).toEqual(['-1', '5', '10']);
  });

  it('parses numeric arrays including negatives', () => {
    const yamlText = `habits:
  test:
    type: summation
    summation_options: [-1, 5, 10]
`;
    const draft = parseHabitDraftFromText(yamlText, 'test');
    expect(draft.quickAddItems).toEqual(['-1', '5', '10']); // sorted on load
    const out = applyHabitDraftToConfigYaml(yamlText, draft, 'test');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits.test).toMatchObject({ summation_options: [-1, 5, 10] });
  });

  it('allows a single quick-add entry', () => {
    const yamlText = `habits:
  test:
    type: summation
    summation_options: [10]
`;
    const draft = parseHabitDraftFromText(yamlText, 'test');
    expect(draft.quickAddItems).toEqual(['10']);
    const out = applyHabitDraftToConfigYaml(yamlText, draft, 'test');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits.test).toMatchObject({ summation_options: [10] });
  });
});

describe('parseHabitDraftFromText', () => {
  it('parses summation fields', () => {
    const draft = parseHabitDraftFromText(SAMPLE, 'push ups');
    expect(draft).toMatchObject({
      name: 'push ups',
      type: 'summation',
      goal: '100',
      quickAddItems: ['1', '10'],
      historyEnabled: false,
    });
  });

  it('parses single_select fields', () => {
    const draft = parseHabitDraftFromText(SAMPLE, 'soda');
    expect(draft).toMatchObject({
      type: 'single_select',
      optionsText: 'none\nlight',
      streakEnabled: true,
      streakOptionsText: 'none',
      streakFrequencyPerWeek: '7',
      historyEnabled: false,
    });
  });

  it('parses streak frequency from yaml', () => {
    const yamlText = `habits:
  gym:
    type: single_select
    options: [yes, no]
    streak:
      options: [yes]
      frequency: 3d/1w
`;
    const draft = parseHabitDraftFromText(yamlText, 'gym');
    expect(draft.streakFrequencyPerWeek).toBe('3');
  });
});

describe('applyHabitDraftToConfigYaml', () => {
  it('updates summation goal and steps', () => {
    const base = parseHabitDraftFromText(SAMPLE, 'push ups');
    const draft: ConfigHabitDraft = {
      ...base,
      goal: '50',
      quickAddItems: ['3', '7'],
    };
    const out = applyHabitDraftToConfigYaml(SAMPLE, draft, 'push ups');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits['push ups']).toEqual({
      type: 'summation',
      goal: 50,
      summation_options: [3, 7],
    });
  });

  it('writes show_longest when enabled', () => {
    const base = parseHabitDraftFromText(SAMPLE, 'soda');
    const draft: ConfigHabitDraft = {
      ...base,
      streakShowLongest: true,
    };
    const out = applyHabitDraftToConfigYaml(SAMPLE, draft, 'soda');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits.soda).toMatchObject({
      streak: { options: ['none'], show_longest: true },
    });
  });

  it('writes streak frequency as Nd/1w when not daily', () => {
    const base = parseHabitDraftFromText(SAMPLE, 'soda');
    const draft: ConfigHabitDraft = {
      ...base,
      streakFrequencyPerWeek: '3',
    };
    const out = applyHabitDraftToConfigYaml(SAMPLE, draft, 'soda');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits.soda).toMatchObject({
      streak: { options: ['none'], frequency: '3d/1w' },
    });
  });

  it('updates single_select options and clears tracking when disabled', () => {
    const base = parseHabitDraftFromText(SAMPLE, 'soda');
    const draft: ConfigHabitDraft = {
      ...base,
      optionsText: 'a\nb\nc',
      streakEnabled: false,
      streakOptionsText: '',
    };
    const out = applyHabitDraftToConfigYaml(SAMPLE, draft, 'soda');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits.soda).toEqual({
      type: 'single_select',
      options: ['a', 'b', 'c'],
    });
  });

  it('writes history period from amount and unit', () => {
    const base = parseHabitDraftFromText(SAMPLE, 'push ups');
    const draft: ConfigHabitDraft = {
      ...base,
      historyEnabled: true,
      historyPeriodAmount: '3',
      historyPeriodUnit: 'w',
    };
    const out = applyHabitDraftToConfigYaml(SAMPLE, draft, 'push ups');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits['push ups']).toEqual({
      type: 'summation',
      goal: 100,
      summation_options: [1, 10],
      history: { period: '3w' },
    });
  });

  it('renames a habit and preserves order', () => {
    const base = parseHabitDraftFromText(SAMPLE, 'push ups');
    const draft: ConfigHabitDraft = { ...base, name: 'pushups' };
    const out = applyHabitDraftToConfigYaml(SAMPLE, draft, 'push ups');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(Object.keys(habits)).toEqual(['pushups', 'soda']);
    expect(habits.pushups).toMatchObject({ type: 'summation', goal: 100 });
    expect(habits['push ups']).toBeUndefined();
  });
});

describe('removeHabitFromConfigYaml', () => {
  it('removes a habit and preserves order of the rest', () => {
    const out = removeHabitFromConfigYaml(SAMPLE, 'push ups');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(Object.keys(habits)).toEqual(['soda']);
    expect(habits.soda).toMatchObject({ type: 'single_select' });
  });
});

describe('addHabitToConfigYaml', () => {
  it('appends a default summation habit with a unique name', () => {
    const { text, habitName } = addHabitToConfigYaml(SAMPLE);
    expect(habitName).toBe('New habit');
    const habits = (yaml.load(text) as { habits: Record<string, unknown> }).habits;
    expect(Object.keys(habits)).toEqual(['push ups', 'soda', 'New habit']);
    expect(habits['New habit']).toEqual({ type: 'summation' });
  });

  it('appends a default single select habit with starter options', () => {
    const { text, habitName } = addHabitToConfigYaml(SAMPLE, 'single_select');
    expect(habitName).toBe('New habit');
    const habits = (yaml.load(text) as { habits: Record<string, unknown> }).habits;
    expect(habits['New habit']).toEqual({
      type: 'single_select',
      options: ['1', '2', '3'],
    });
  });

  it('allocates numbered names when the default is taken', () => {
    const first = addHabitToConfigYaml(SAMPLE);
    const second = addHabitToConfigYaml(first.text);
    expect(second.habitName).toBe('New habit 2');
  });
});
