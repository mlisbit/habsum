import { describe, expect, it } from 'vitest';
import { yamlString } from '@habsum/types/common/misc';
import {
  getConfigDeletions,
  getConfigMigrations,
  getConfigJson,
  getUserConfigFromJson,
} from '../config-editor-utils.js';
import YAMLConfigConvertor from '../classes/yaml-config-convertor.js';

const previous = yamlString(`habits:
  Reading:
    type: single_select
    options: [None, A bit, A lot]
    insights: [current_streak]
    streak_options:
      options: [A bit, A lot]
      frequency: 7d
`);

describe('single-select config editing', () => {
  it('round-trips structured options and writes only frequency in streak_options', () => {
    const config = getConfigJson('reader', previous);
    const converted = new YAMLConfigConvertor().convert(getUserConfigFromJson(config));
    expect(converted).toContain('label: None\n        sentiment: negative');
    expect(converted).toContain('streak_options:\n      frequency: 7d');
    expect(getConfigJson('reader', converted)).toEqual(config);
    expect(getConfigMigrations(previous, converted)).toEqual([]);
    expect(getConfigDeletions(previous, converted)).toEqual([]);
  });

  it('detects renamed and deleted labels in object options', () => {
    const renamed = yamlString(`habits:
  Reading:
    type: single_select
    options:
      - {label: None, sentiment: negative}
      - {label: A little, sentiment: positive}
      - {label: A lot, sentiment: positive}
`);
    expect(getConfigMigrations(previous, renamed)).toEqual([['Reading.A bit', 'Reading.A little']]);
    expect(getConfigDeletions(previous, renamed)).toEqual([]);
    const deleted = yamlString(
      renamed.replace('      - {label: A lot, sentiment: positive}\n', ''),
    );
    expect(getConfigDeletions(renamed, deleted)).toEqual(['Reading.A lot']);
  });

  it('does not migrate or delete recorded data when only sentiment changes', () => {
    const converted = new YAMLConfigConvertor().convert(
      getUserConfigFromJson(getConfigJson('reader', previous)),
    );
    const changed = yamlString(converted.replace('sentiment: negative', 'sentiment: positive'));
    expect(getConfigMigrations(converted, changed)).toEqual([]);
    expect(getConfigDeletions(converted, changed)).toEqual([]);
  });
});
