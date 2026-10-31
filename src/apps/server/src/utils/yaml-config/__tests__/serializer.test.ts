import { readFileSync } from 'node:fs';
import { yamlString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import type { UserConfig } from '../../../types/userConfig.js';
import YAMLConfig from '../yaml-config.js';

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

const config: UserConfig = {
  includeAbsentDaysInAverage: true,
  habits: [
    {
      name: 'mood',
      type: 'single_select',
      repeat: ['monday', 'wednesday'],
      settings: {
        options: [
          { label: 'yes', sentiment: 'positive' },
          { label: 'no', sentiment: 'negative' },
        ],
        theme: 'checkbox',
      },
      data_visualization: { heatmap: {} },
      insights: ['current_streak', 'longest_streak'],
      streak_options: { frequency: '3d' },
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
      streak_options: { frequency: '5d' },
    },
  ],
};

describe('YAMLConfigSerializer', () => {
  it('serializes configuration data into persisted yaml text without user context', () => {
    expect(new YAMLConfig().getSerializer().serialize(config)).toBe(
      fixture('new-user-config.yaml'),
    );
  });

  it('serializes parsed legacy yaml into the new persisted schema', () => {
    const content = yamlString(fixture('legacy-user-config.yaml'));
    const legacy = new YAMLConfig(content).parse();
    expect(new YAMLConfig().getSerializer().serialize(legacy)).toBe(
      fixture('new-user-config.yaml'),
    );
  });

  it('produces yaml that can be parsed back into configuration data', () => {
    const yaml = new YAMLConfig().getSerializer().serialize(config);
    expect(new YAMLConfig(yaml).parse()).toMatchObject({
      includeAbsentDaysInAverage: true,
      habits: config.habits,
    });
  });

  it('writes text habit configuration without presentation options or daily text', () => {
    const textConfig: UserConfig = {
      includeAbsentDaysInAverage: false,
      habits: [
        {
          name: 'journal',
          type: 'text',
          repeat: ['monday'],
          data_visualization: { heatmap: {} },
          insights: ['current_streak'],
          streak_options: { frequency: '7d' },
          settings: {
            reset: ['saturday'],
          },
        },
      ],
    };

    expect(new YAMLConfig().getSerializer().serialize(textConfig)).toBe(`# version: 1
habits:
  journal:
    type: text
    repeat: [monday]
    reset: [saturday]
`);
  });
});
