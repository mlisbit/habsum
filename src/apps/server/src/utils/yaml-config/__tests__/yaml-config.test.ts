import { afterEach, describe, expect, it, vi } from 'vitest';
import { yamlString } from '@habsum/types/common/misc';
import YAMLConfig from '../yaml-config.js';
import YAMLConfigSerializer from '../serializer.js';

const content = yamlString(`habits:
  Reading:
    type: single_select
    options: [None, A bit]
`);

describe('YAMLConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to the latest configured version when no config is provided', () => {
    const config = new YAMLConfig();

    expect(config.version).toBe(YAMLConfig.latestVersion);
    expect(new YAMLConfig(undefined).version).toBe(YAMLConfig.latestVersion);
    expect(config.isOutdated()).toBe(false);
  });

  it('detects the version from the supplied config', () => {
    const versioned = yamlString(`# version: 1\n${content}`);
    const config = new YAMLConfig(versioned);

    expect(config.version).toBe(1);
    expect(config.parse()).toEqual(new YAMLConfig(content).parse());
  });

  it('treats supplied unversioned configs as version 1 even when a newer version is current', () => {
    vi.spyOn(YAMLConfig, 'latestVersion', 'get').mockReturnValue(2);
    const config = new YAMLConfig(content);

    expect(config.version).toBe(1);
    expect(config.isOutdated()).toBe(true);
    expect(config.parse().habits[0]?.name).toBe('Reading');
  });

  it('parses configuration data without user context or identity', () => {
    const parsed = new YAMLConfig(yamlString(`user: ignored\n${content}`)).parse();

    expect(parsed).toMatchObject({
      includeAbsentDaysInAverage: false,
      habits: [{ name: 'Reading', type: 'single_select' }],
    });
    expect(parsed).not.toHaveProperty('user');
  });

  it('round-trips the shared model from an older parser through the current serializer', () => {
    const config = new YAMLConfig(content);
    const parsed = config.parse();
    const serialized = config.getSerializer().serialize(parsed);

    expect(serialized.startsWith(`# version: ${YAMLConfig.latestVersion}\n`)).toBe(true);
    expect(new YAMLConfig(serialized).parse()).toEqual(parsed);
  });

  it('uses the latest serializer and version header even when an older parser is selected', () => {
    const config = new YAMLConfig(content);
    const parsed = config.parse();
    vi.spyOn(YAMLConfig, 'latestVersion', 'get').mockReturnValue(2);
    const serialize = vi
      .spyOn(YAMLConfigSerializer.prototype, 'serialize')
      .mockReturnValue(yamlString('updated_habits: []\n'));

    expect(config.getSerializer().serialize(parsed)).toBe('# version: 2\nupdated_habits: []\n');
    expect(serialize).toHaveBeenCalledWith(parsed);
    expect(config.version).toBe(1);
    expect(config.isOutdated()).toBe(true);
  });

  it('reads commented versions and defaults unversioned YAML to version 1', () => {
    expect(YAMLConfig.getVersion(content)).toBe(1);
    expect(YAMLConfig.getVersion(yamlString(`# version: 1\n${content}`))).toBe(1);
    expect(YAMLConfig.getVersion(yamlString(`# version: 2\n${content}`))).toBe(2);
    expect(new YAMLConfig(yamlString(`# version: 1\n${content}`)).parse()).toEqual(
      new YAMLConfig(content).parse(),
    );
  });

  it('reads versions after introductory comments, blank lines, and a byte-order mark', () => {
    expect(
      YAMLConfig.getVersion(yamlString(`\uFEFF\r\n# My habits\r\n# version: 2\r\n${content}`)),
    ).toBe(2);
  });

  it('ignores version-like comments in the YAML body', () => {
    const configText = yamlString(`habits: {}\n# version: 2\n`);
    expect(YAMLConfig.getVersion(configText)).toBe(1);
    expect(new YAMLConfig(configText).parse().habits).toEqual([]);
  });

  it.each(['', '0', '-1', '1.5', 'unknown', '9007199254740992'])(
    'rejects malformed version comments: %s',
    (version) => {
      const configText = yamlString(`# version: ${version}\n${content}`);
      expect(() => new YAMLConfig(configText)).toThrow(
        'yaml config version must be a positive integer',
      );
    },
  );

  it('rejects duplicate version comments', () => {
    expect(() =>
      YAMLConfig.getVersion(yamlString(`# version: 1\n# version: 2\n${content}`)),
    ).toThrow('config must have only one version comment');
  });

  it('rejects unsupported commented versions when parsing and adding a header', () => {
    const config = new YAMLConfig();
    const configText = yamlString(`# version: 2\n${content}`);
    expect(() => new YAMLConfig(configText).parse()).toThrow('unsupported yaml config version: 2');
    expect(() => config.getVersionedText(configText)).toThrow(YAMLConfig.ConfigValidationError);
  });

  it('adds the version header once while preserving introductory comments and YAML content', () => {
    const config = new YAMLConfig();
    const configText = yamlString(`# My habits\n${content}`);
    const expected = `# version: 1\n${configText}`;
    expect(config.getVersionedText(configText)).toBe(expected);
    expect(config.getVersionedText(yamlString(expected))).toBe(expected);
    expect(config.getVersionedText(yamlString(`# My habits\n# version: 1\n${content}`))).toBe(
      expected,
    );
  });

  it('exposes parser validation errors through the facade', () => {
    expect(() => new YAMLConfig(yamlString('habits: []')).parse()).toThrow(
      YAMLConfig.ConfigValidationError,
    );
  });

  it.each([undefined, yamlString(''), yamlString(' \n')])(
    'rejects parsing missing or blank config text: %s',
    (text) => {
      expect(() => new YAMLConfig(text).parse()).toThrow('config cannot be empty');
    },
  );

  it.each([YAMLConfig.latestVersion + 1, Number.MAX_SAFE_INTEGER])(
    'rejects unsupported version %s in constructor input',
    (version) => {
      const configText = yamlString(`# version: ${version}\n${content}`);
      expect(() => new YAMLConfig(configText)).toThrow(YAMLConfig.ConfigValidationError);
      expect(() => new YAMLConfig(configText)).toThrow(
        `unsupported yaml config version: ${version}`,
      );
    },
  );
});
