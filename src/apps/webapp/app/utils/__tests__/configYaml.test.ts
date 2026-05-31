import { describe, expect, it } from 'vitest';

import {
  buildConfigDeletions,
  buildConfigMigrations,
  dumpConfigYaml,
  habitOrderKey,
  parseConfigHabitCards,
  reorderHabitsInConfigYaml,
} from '../configYaml';
import yaml from 'js-yaml';

const SAMPLE = `habits:
  push ups:
    type: summation
    goal: 100
  soda consumption:
    type: single_select
    options: [none, light, moderate]
  pull ups:
    type: summation
`;

describe('parseConfigHabitCards', () => {
  it('returns habits in yaml key order', () => {
    expect(parseConfigHabitCards(SAMPLE).map((h) => h.name)).toEqual([
      'push ups',
      'soda consumption',
      'pull ups',
    ]);
  });

  it('parses habit metadata for cards', () => {
    const [pushUps, soda] = parseConfigHabitCards(SAMPLE);
    expect(pushUps).toMatchObject({
      type: 'summation',
      goal: 100,
      hasSummationOptions: false,
    });
    expect(soda).toMatchObject({
      type: 'single_select',
      optionLabels: ['none', 'light', 'moderate'],
    });
  });
});

describe('reorderHabitsInConfigYaml', () => {
  it('reorders habit keys while preserving each habit block', () => {
    const out = reorderHabitsInConfigYaml(SAMPLE, ['pull ups', 'push ups', 'soda consumption']);
    expect(parseConfigHabitCards(out).map((h) => h.name)).toEqual([
      'pull ups',
      'push ups',
      'soda consumption',
    ]);
    expect(out).toContain('goal: 100');
    expect(out).toContain('options:');
  });

  it('inserts a blank line between habit entries', () => {
    const out = reorderHabitsInConfigYaml(SAMPLE, ['push ups', 'soda consumption', 'pull ups']);
    expect(out).toMatch(/goal: 100\n\n {2}soda consumption:\n {4}type: single_select/);
  });
});

describe('dumpConfigYaml', () => {
  it('separates habits with a blank line', () => {
    const parsed = yaml.load(SAMPLE) as Record<string, unknown>;
    const out = dumpConfigYaml(parsed);
    expect(out.split('\n\n').length).toBeGreaterThanOrEqual(2);
    expect(out).toMatch(/habits:\n {2}push ups:[\s\S]*\n\n {2}soda consumption:/);
  });

  it('writes options inline without quoting yes/no', () => {
    const out = dumpConfigYaml({
      habits: {
        mood: { type: 'single_select', options: ['yes', 'no'] },
        soda: { type: 'single_select', options: ['none', 'light', 'moderate', 'heavy'] },
      },
    });
    expect(out).toContain('options: [yes, no]');
    expect(out).toContain('options: [none, light, moderate, heavy]');
    expect(out).not.toMatch(/'yes'|'no'/);
    expect(parseConfigHabitCards(out).map((h) => h.optionLabels)).toEqual([
      ['yes', 'no'],
      ['none', 'light', 'moderate', 'heavy'],
    ]);
  });

  it('quotes numeric option labels so they round-trip as strings', () => {
    const out = dumpConfigYaml({
      habits: {
        rating: { type: 'single_select', options: ['1', '2', '3'] },
      },
    });
    expect(out).toContain("options: ['1', '2', '3']");
    expect(parseConfigHabitCards(out)[0].optionLabels).toEqual(['1', '2', '3']);
  });

  it('quotes option labels that need escaping', () => {
    const out = dumpConfigYaml({
      habits: {
        notes: { type: 'single_select', options: ['a:b', 'plain'] },
      },
    });
    expect(out).toContain("options: ['a:b', plain]");
  });
});

describe('habitOrderKey', () => {
  it('changes when order changes', () => {
    expect(habitOrderKey(['a', 'b'])).not.toBe(habitOrderKey(['b', 'a']));
  });
});

describe('buildConfigMigrations', () => {
  it('includes a habit rename migration', () => {
    const next = `habits:
  pushups:
    type: summation
    goal: 100
  soda consumption:
    type: single_select
    options: [none, light, moderate]
  pull ups:
    type: summation
`;
    expect(buildConfigMigrations(SAMPLE, next)).toEqual([['push ups', 'pushups']]);
  });

  it('includes a single-select option rename migration', () => {
    const previous = `habits:
  mood:
    type: single_select
    options: [blackout, okay]
`;
    const next = `habits:
  mood:
    type: single_select
    options: [wrecked, okay]
`;
    expect(buildConfigMigrations(previous, next)).toEqual([['mood.blackout', 'mood.wrecked']]);
  });

  it('includes option renames under a renamed habit', () => {
    const previous = `habits:
  drinking:
    type: single_select
    options: [blackout, okay]
`;
    const next = `habits:
  drinking log:
    type: single_select
    options: [wrecked, okay]
`;
    expect(buildConfigMigrations(previous, next)).toEqual([
      ['drinking', 'drinking log'],
      ['drinking.blackout', 'drinking log.wrecked'],
    ]);
  });

  it('does not treat add/remove option changes as renames', () => {
    const previous = `habits:
  mood:
    type: single_select
    options: [blackout, okay]
`;
    const next = `habits:
  mood:
    type: single_select
    options: [blackout, okay, wrecked]
`;
    expect(buildConfigMigrations(previous, next)).toEqual([]);
  });
});

describe('buildConfigDeletions', () => {
  it('does not include renamed single-select options', () => {
    const previous = `habits:
  mood:
    type: single_select
    options: [blackout, okay]
`;
    const next = `habits:
  mood:
    type: single_select
    options: [wrecked, okay]
`;
    expect(buildConfigDeletions(previous, next)).toEqual([]);
  });

  it('includes removed single-select options', () => {
    const previous = `habits:
  mood:
    type: single_select
    options: [blackout, okay]
`;
    const next = `habits:
  mood:
    type: single_select
    options: [okay]
`;
    expect(buildConfigDeletions(previous, next)).toEqual(['mood.blackout']);
  });

  it('does not include option removals under deleted habits', () => {
    const previous = `habits:
  mood:
    type: single_select
    options: [blackout, okay]
`;
    const next = `habits: {}
`;
    expect(buildConfigDeletions(previous, next)).toEqual([]);
  });
});
