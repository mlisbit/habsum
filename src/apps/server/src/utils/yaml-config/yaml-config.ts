import { yamlString, type YAMLString } from '@habsum/types/common/misc';
import type { ConfigData } from '../../types/userConfig.js';
import YAMLConfigParserV1 from './versions/v1.js';
import YAMLConfigSerializer from './serializer.js';
import {
  YAMLConfigValidationError,
  type YAMLConfigParserConstructor,
  type YAMLConfigSerializer as YAMLConfigSerializerInterface,
} from './types.js';

type YAMLConfigHeader = {
  version: number;
  lines: string[];
  versionCommentIndex?: number;
};

export default class YAMLConfig {
  static readonly ConfigValidationError = YAMLConfigValidationError;

  private static readonly versions: Readonly<Record<number, YAMLConfigParserConstructor>> = {
    1: YAMLConfigParserV1,
  };

  static get latestVersion(): number {
    return Math.max(...Object.keys(YAMLConfig.versions).map(Number));
  }

  readonly version: number;

  private readonly parserConstructor: YAMLConfigParserConstructor;

  constructor(private readonly content?: YAMLString) {
    this.version =
      content === undefined ? YAMLConfig.latestVersion : YAMLConfig.getVersion(content);
    this.validateVersion(this.version);
    this.parserConstructor = YAMLConfig.versions[this.version];
  }

  static getVersion(content: YAMLString): number {
    return YAMLConfig.getHeader(content).version;
  }

  private static getHeader(content: YAMLString): YAMLConfigHeader {
    const header: YAMLConfigHeader = {
      version: 1,
      lines: content.replace(/^\uFEFF/, '').split(/\r?\n/),
    };
    for (const [index, line] of header.lines.entries()) {
      if (!line.trim()) continue;
      if (!line.trimStart().startsWith('#')) break;
      const match = line.match(/^[\t ]*#[\t ]*version[\t ]*:(.*)$/);
      if (!match) continue;
      if (header.versionCommentIndex !== undefined) {
        throw new YAMLConfigValidationError('config must have only one version comment');
      }
      const rawVersion = match[1].trim();
      const version = Number(rawVersion);
      if (!/^[1-9]\d*$/.test(rawVersion) || !Number.isSafeInteger(version)) {
        throw new YAMLConfigValidationError('yaml config version must be a positive integer');
      }
      header.version = version;
      header.versionCommentIndex = index;
    }
    return header;
  }

  private validateVersion(version: number): void {
    if (!Object.hasOwn(YAMLConfig.versions, version)) {
      throw new YAMLConfigValidationError(`unsupported yaml config version: ${version}`);
    }
    if (version !== this.version) {
      throw new YAMLConfigValidationError(
        `yaml config version ${version} does not match requested version ${this.version}`,
      );
    }
  }

  isOutdated(): boolean {
    return this.version < YAMLConfig.latestVersion;
  }

  parse(): ConfigData {
    if (this.content === undefined) {
      throw new YAMLConfigValidationError('config cannot be empty');
    }
    return new this.parserConstructor().parse(this.content);
  }

  getSerializer(): YAMLConfigSerializerInterface {
    const serializer = new YAMLConfigSerializer();
    return {
      serialize: (config) =>
        yamlString(`# version: ${YAMLConfig.latestVersion}\n${serializer.serialize(config)}`),
    };
  }

  getVersionedText(content: YAMLString): YAMLString {
    const header = YAMLConfig.getHeader(content);
    this.validateVersion(header.version);
    if (header.versionCommentIndex !== undefined) {
      header.lines.splice(header.versionCommentIndex, 1);
    }
    return yamlString(`# version: ${this.version}\n${header.lines.join('\n')}`);
  }
}
