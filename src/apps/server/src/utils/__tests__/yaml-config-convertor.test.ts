import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { UserConfig } from '../../types/userConfig.js';
import { YAMLConfigConvertor } from '../yaml-config-convertor.js';
import { YAMLConfigParser } from '../yaml-config-parser.js';

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
      goal: null,
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
      repeat: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      summationOptions: { manualInput: true, increments: [5, 10, 25] },
      history: { period: '2w', displays: ['weekly_history', 'heatmap'] },
      streak: { options: ['100'], frequency: '5d/1w' },
    },
  ],
};

describe('YAMLConfigConvertor', () => {
  it('converts a user config model into persisted yaml text', () => {
    expect(new YAMLConfigConvertor().convert(config)).toBe(fixture('converted-user-config.yaml'));
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
