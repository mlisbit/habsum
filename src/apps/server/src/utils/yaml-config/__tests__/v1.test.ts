import { readFileSync } from 'node:fs';
import { yamlString, type YAMLString } from '@habsum/types/common/misc';
import { describe, expect, it } from 'vitest';
import YAMLConfig from '../yaml-config.js';

function fixture(name: string): YAMLString {
  return yamlString(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
}

function getConfigData(content: YAMLString) {
  return new YAMLConfig(content).parse();
}

describe('YAMLConfigParser v1', () => {
  it('reads previously saved good/bad sentiments as positive/negative', () => {
    const config = getConfigData(
      yamlString(`habits:
  Reading:
    type: single_select
    options:
      - {label: None, sentiment: bad}
      - {label: A bit, sentiment: good}
`),
    );
    expect(config.habits[0]?.settings).toEqual({
      options: [
        { label: 'None', sentiment: 'negative' },
        { label: 'A bit', sentiment: 'positive' },
      ],
    });
  });

  it('reads option sentiments and frequency without a separate streak option list', () => {
    const config = getConfigData(
      yamlString(`habits:
  Reading:
    type: single_select
    options:
      - label: None
        sentiment: negative
      - label: A bit
        sentiment: positive
      - label: A lot
    insights: [current_streak]
    streak_options:
      frequency: 7d
`),
    );
    expect(config.habits[0]).toMatchObject({
      settings: {
        options: [
          { label: 'None', sentiment: 'negative' },
          { label: 'A bit', sentiment: 'positive' },
          { label: 'A lot', sentiment: 'positive' },
        ],
      },
      streak_options: { frequency: '7d' },
    });
    expect(config.habits[0]?.streak_options).not.toHaveProperty('options');
  });

  it('defaults old string options to positive when no explicit streak list exists', () => {
    const config = getConfigData(
      yamlString(`habits:
  Reading:
    type: single_select
    options: [None, A bit, A lot]
`),
    );
    expect(config.habits[0]?.settings).toEqual({
      options: [
        { label: 'None', sentiment: 'positive' },
        { label: 'A bit', sentiment: 'positive' },
        { label: 'A lot', sentiment: 'positive' },
      ],
    });
  });

  it('preserves selections from the previous streak_options schema', () => {
    const config = getConfigData(
      yamlString(`habits:
  Reading:
    type: single_select
    options: [None, A bit, A lot]
    insights: [current_streak]
    streak_options:
      options: [A bit, A lot]
      frequency: 7d
`),
    );
    expect(config.habits[0]?.settings).toEqual({
      options: [
        { label: 'None', sentiment: 'negative' },
        { label: 'A bit', sentiment: 'positive' },
        { label: 'A lot', sentiment: 'positive' },
      ],
    });
  });

  it.each([
    ['[{label: Read, sentiment: neutral}]', 'sentiment must be positive or negative'],
    ['[{label: ""}]', 'require a non-empty label'],
    ['[Read, Read]', 'duplicate option'],
  ])('rejects invalid options: %s', (options, message) => {
    expect(() =>
      getConfigData(
        yamlString(`habits:
  Reading:
    type: single_select
    options: ${options}
`),
      ),
    ).toThrow(message);
  });

  it('rejects conflicting legacy eligibility and explicit sentiments', () => {
    expect(() =>
      getConfigData(
        yamlString(`habits:
  Reading:
    type: single_select
    options: [{label: Read, sentiment: negative}]
    streak_options:
      options: [Read]
      frequency: 7d
`),
      ),
    ).toThrow('cannot mix option sentiments with legacy streak options');
  });

  it('parses legacy and new yaml config into the same user config model', () => {
    const legacyConfig = getConfigData(fixture('legacy-user-config.yaml'));
    const newConfig = getConfigData(fixture('new-user-config.yaml'));

    expect(legacyConfig).toEqual(newConfig);
    expect(newConfig).toMatchObject({
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
          settings: {
            goal: 100,
            summationOptions: { manualInput: true, increments: [5, 10, 25] },
          },
          data_visualization: { bargraph: { period: '2w' }, heatmap: {} },
          insights: ['current_streak', 'average'],
          streak_options: { frequency: '5d' },
        },
      ],
    });
  });

  it('throws a config validation error for invalid yaml config text', () => {
    expect(() => getConfigData(fixture('invalid-repeat.yaml'))).toThrow(
      YAMLConfig.ConfigValidationError,
    );
  });

  it('rejects unsupported habit themes', () => {
    expect(() =>
      getConfigData(
        yamlString(`habits:
  mood:
    type: single_select
    options: [yes, no]
    theme: dark
`),
      ),
    ).toThrow('habit "mood" theme must be "checkbox"');
  });

  it('parses independent average and streak insight visibility', () => {
    const config = getConfigData(
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
      streak_options: { frequency: '7d' },
    });
  });

  it('parses text habits while treating visualization and streak config as no-ops', () => {
    const config = getConfigData(
      yamlString(`habits:
  journal:
    type: text
    repeat: [monday, friday]
    reset: [saturday]
    data_visualization: ignored
    insights: [average, current_streak]
    streak_options: ignored
`),
    );

    expect(config.habits).toEqual([
      {
        name: 'journal',
        type: 'text',
        repeat: ['monday', 'friday'],
        data_visualization: undefined,
        insights: [],
        streak_options: undefined,
        settings: {
          reset: ['saturday'],
        },
      },
    ]);
  });

  it('defaults text habit reset to every day', () => {
    const config = getConfigData(
      yamlString(`habits:
  journal:
    type: text
`),
    );

    expect(config.habits[0]?.settings).toEqual({
      reset: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    });
  });

  it('validates text habit reset using the repeat weekday options', () => {
    expect(() =>
      getConfigData(
        yamlString(`habits:
  journal:
    type: text
    reset: [someday]
`),
      ),
    ).toThrow(
      'habit "journal" reset must only include monday, tuesday, wednesday, thursday, friday, saturday, sunday',
    );
  });

  it('rejects unknown habit types', () => {
    expect(() =>
      getConfigData(
        yamlString(`habits:
  mystery:
    type: something_else
`),
      ),
    ).toThrow('habit "mystery" type must be summation, single_select, or text');
  });
});
