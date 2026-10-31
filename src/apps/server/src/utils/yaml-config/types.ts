import type { YAMLString } from '@habsum/types/common/misc';
import type { UserConfig } from '../../types/userConfig.js';

export interface YAMLConfigParser {
  parse(content: YAMLString): UserConfig;
}

export interface YAMLConfigSerializer {
  serialize(config: UserConfig): YAMLString;
}

export type YAMLConfigParserConstructor = new () => YAMLConfigParser;

export class YAMLConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YAMLConfigValidationError';
  }
}
