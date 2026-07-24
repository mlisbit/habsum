import { readFileSync } from 'node:fs';
import { yamlString, type YAMLString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import YAMLConfigParser from '../classes/yaml-config-parser.js';

function fixture(name: string): YAMLString {
  return yamlString(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
}

describe('YAMLConfigParser', () => {
  it('parses legacy and new yaml config into the same user config model', () => {
    const parser = new YAMLConfigParser('yaml-parser-user');
    const legacyConfig = parser.parse(fixture('legacy-user-config.yaml'));
    const newConfig = parser.parse(fixture('new-user-config.yaml'));

    expect(legacyConfig).toEqual(newConfig);
    expect(newConfig).toMatchObject({
      user: 'yaml-parser-user',
      includeAbsentDaysInAverage: true,
      habits: [
        {
          name: 'mood',
          type: 'single_select',
          repeat: ['monday', 'wednesday'],
          settings: {
            options: ['great', 'okay', 'bad'],
            theme: 'dark',
          },
          data_visualization: { heatmap: {} },
          insights: ['current_streak', 'longest_streak'],
          streak_options: { options: ['great'], frequency: '3d' },
        },
        {
          name: 'push ups',
          type: 'summation',
          settings: {
            goal: 100,
            summationOptions: { manualInput: true, increments: [5, 10, 25] },
          },
          data_visualization: { bargraph: { period: '2w' }, heatmap: {} },
          insights: ['current_streak', 'average'],
          streak_options: { options: ['100'], frequency: '5d' },
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
    data_visualization:
      bargraph:
        period: 3w
    insights:
      - longest_streak
      - average
    streak_options:
      frequency: 7d
`),
    );

    expect(config.habits[0]).toMatchObject({
      data_visualization: { bargraph: { period: '3w' } },
      insights: ['longest_streak', 'average'],
      streak_options: { options: ['100'], frequency: '7d' },
    });
  });
});
