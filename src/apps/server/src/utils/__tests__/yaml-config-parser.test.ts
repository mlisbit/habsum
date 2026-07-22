import { readFileSync } from 'node:fs';
import { yamlString, type YAMLString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import { YAMLConfigParser } from '../yaml-config-parser.js';

function fixture(name: string): YAMLString {
  return yamlString(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
}

describe('YAMLConfigParser', () => {
  it('parses yaml config text into a user config model', () => {
    const config = new YAMLConfigParser('yaml-parser-user').parse(
      fixture('valid-user-config.yaml'),
    );

    expect(config).toMatchObject({
      user: 'yaml-parser-user',
      includeAbsentDaysInAverage: true,
      habits: [
        {
          name: 'mood',
          type: 'single_select',
          repeat: ['monday', 'wednesday'],
          options: ['great', 'okay', 'bad'],
          theme: 'dark',
          history: { period: '3w', displays: ['heatmap'] },
          streak: { options: ['great'], frequency: '3d/1w', show_longest: true },
        },
        {
          name: 'push ups',
          type: 'summation',
          goal: 100,
          summationOptions: { manualInput: true, increments: [5, 10, 25] },
          history: { period: '2w', displays: ['weekly_history', 'heatmap'] },
          streak: { options: ['100'], frequency: '5d/1w' },
        },
      ],
    });
  });

  it('throws a config validation error for invalid yaml config text', () => {
    expect(() =>
      new YAMLConfigParser('yaml-parser-user').parse(fixture('invalid-repeat.yaml')),
    ).toThrow(YAMLConfigParser.ConfigValidationError);
  });

  it('parses independent average and streak insight visibility', () => {
    const config = new YAMLConfigParser('insights-user').parse(
      yamlString(`habits:
  push ups:
    type: summation
    goal: 100
    history:
      displays: []
      period: 3w
      show_average: true
    streak:
      options: ['100']
      show_current: false
      show_longest: true
`),
    );

    expect(config.habits[0]).toMatchObject({
      history: { displays: [], period: '3w', show_average: true },
      streak: { options: ['100'], show_current: false, show_longest: true },
    });
  });
});
