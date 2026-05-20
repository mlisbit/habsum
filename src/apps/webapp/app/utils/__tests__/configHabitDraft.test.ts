import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';

import {
  applyHabitDraftToConfigYaml,
  parseHabitDraftFromText,
  type ConfigHabitDraft,
} from '../configHabitDraft';

const SAMPLE = `habits:
  push ups:
    type: summation
    goal: 100
    summation_options: [2, 5]
  soda:
    type: single_select
    options: [none, light]
    streak:
      options: [none]
    history:
      period: 2w
`;

describe('parseHabitDraftFromText', () => {
  it('parses summation fields', () => {
    const draft = parseHabitDraftFromText(SAMPLE, 'push ups');
    expect(draft).toMatchObject({
      name: 'push ups',
      type: 'summation',
      goal: '100',
      summationMode: 'fixed',
      summationSub: '2',
      summationAdd: '5',
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
      historyEnabled: true,
      historyPeriod: '2w',
    });
  });
});

describe('applyHabitDraftToConfigYaml', () => {
  it('updates summation goal and steps', () => {
    const base = parseHabitDraftFromText(SAMPLE, 'push ups');
    const draft: ConfigHabitDraft = { ...base, goal: '50', summationSub: '3', summationAdd: '7' };
    const out = applyHabitDraftToConfigYaml(SAMPLE, draft, 'push ups');
    const habits = (yaml.load(out) as { habits: Record<string, unknown> }).habits;
    expect(habits['push ups']).toEqual({
      type: 'summation',
      goal: 50,
      summation_options: [3, 7],
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
      history: { period: '2w' },
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
