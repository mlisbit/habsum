import type { YAMLString } from '@habsum/types/common/misc';
import type { ConfigData } from '../../types/userConfig.js';

export interface YAMLConfigParser {
  parse(content: YAMLString): ConfigData;
}

export interface YAMLConfigSerializer {
  serialize(config: ConfigData): YAMLString;
}

export type YAMLConfigParserConstructor = new () => YAMLConfigParser;

export class YAMLConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YAMLConfigValidationError';
  }
}
