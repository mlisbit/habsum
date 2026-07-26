import { readFileSync } from 'node:fs';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import type { UserConfig } from '../../types/userConfig.js';
import YAMLConfigConvertor from '../classes/yaml-config-convertor.js';
import YAMLConfigParser from '../classes/yaml-config-parser.js';

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

const config: UserConfig = {
  user: 'yaml-convertor-user',
  includeAbsentDaysInAverage: true,
  habits: [
    {
      name: 'mood',
      type: 'single_select',
      repeat: ['monday', 'wednesday'],
      settings: {
        options: ['yes', 'no'],
        theme: 'checkbox',
      },
      data_visualization: { heatmap: {} },
      insights: ['current_streak', 'longest_streak'],
      streak_options: { options: ['yes'], frequency: '3d' },
    },
    {
      name: 'push ups',
      type: 'summation',
      repeat: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      settings: {
        goal: 100,
        summationOptions: { manualInput: true, increments: [5, 10, 25] },
      },
      data_visualization: { heatmap: {}, bargraph: { period: '2w' } },
      insights: ['current_streak', 'average'],
      streak_options: { options: ['100'], frequency: '5d' },
    },
  ],
};

describe('YAMLConfigConvertor', () => {
  it('converts a user config model into persisted yaml text', () => {
    expect(new YAMLConfigConvertor().convert(config)).toBe(fixture('new-user-config.yaml'));
  });

  it('converts parsed legacy yaml into the new persisted schema', () => {
    const legacy = new YAMLConfigParser('legacy-convertor-user').parse(
      yamlString(fixture('legacy-user-config.yaml')),
    );
    expect(new YAMLConfigConvertor().convert(legacy)).toBe(fixture('new-user-config.yaml'));
  });

  it('produces yaml that can be parsed back into a user config model', () => {
    const yaml = new YAMLConfigConvertor().convert(config);
    expect(new YAMLConfigParser('round-trip-user').parse(yaml)).toMatchObject({
      user: 'round-trip-user',
      includeAbsentDaysInAverage: true,
      habits: config.habits,
    });
  });
});
