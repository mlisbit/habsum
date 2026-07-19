// Service layer for YAML user config persistence plus user-scoped config HTTP orchestration.
import {
  yamlString,
  type UserConfigGetResponse,
  type UserConfigPutRequest,
  type UserConfigPutResponse,
  type YAMLString,
} from '@habsum/types/common/misc';
import {
  buildConfigDeletions,
  buildConfigMigrations,
  configResponseParts,
} from '../config-editor.js';
import { ConfigRepository } from '../repositories/config-repository.js';
import { HabitRepository } from '../repositories/habit-repository.js';
import type { HabitDef, UserConfig } from '../types/userConfig.js';
import { YAMLConfigParser } from '../utils/yaml-config-parser.js';
import { YAMLConfigConvertor } from '../utils/yaml-config-convertor.js';
import { isSafeConfigUserId } from '../request-helpers.js';

const EMPTY_USER_CONFIG_TEXT = yamlString('habits: {}\n');

type ConfigServiceResult<T> = {
  status: number;
  body: T | { error: string };
};

type GetUserConfigInput = {
  user: string;
};

type PutUserConfigInput = {
  user: string;
  body?: Partial<UserConfigPutRequest>;
};

type ConfigMigrationTuple = [string, string];

type ClassifiedConfigMigrations = {
  habitRenames: ConfigMigrationTuple[];
  optionRenames: Array<{ habit: string; fromOption: string; toOption: string }>;
};

type ConfigDeletion = { habit: string; option: string };

function parseConfigMigrationTuples(raw: unknown): ConfigMigrationTuple[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;

  const migrations: ConfigMigrationTuple[] = [];
  for (const item of raw) {
    if (
      !Array.isArray(item) ||
      item.length !== 2 ||
      typeof item[0] !== 'string' ||
      typeof item[1] !== 'string'
    ) {
      return null;
    }
    migrations.push([item[0], item[1]]);
  }
  return migrations;
}

function parseConfigDeletions(raw: unknown): string[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  return raw.every((item): item is string => typeof item === 'string') ? raw : null;
}

function optionDeletionForPath(path: string, previousHabits: HabitDef[]): ConfigDeletion | null {
  for (const habit of previousHabits) {
    if (habit.type !== 'single_select') continue;
    for (const option of habit.options ?? []) {
      if (`${habit.name}.${option}` === path) {
        return { habit: habit.name, option };
      }
    }
  }
  return null;
}

function applyConfigDataDeletions(
  user: string,
  deletions: string[],
  previousHabits: HabitDef[],
  habitRepository: HabitRepository,
): void {
  for (const path of deletions) {
    const deletion = optionDeletionForPath(path, previousHabits);
    if (!deletion) continue;
    habitRepository.deleteDailySelectValue(user, deletion.habit, deletion.option);
  }
}

function optionMigrationForHabitPair(
  fromPath: string,
  toPath: string,
  previousHabit: HabitDef,
  nextHabit: HabitDef,
): { habit: string; fromOption: string; toOption: string } | null {
  if (previousHabit.type !== 'single_select' || nextHabit.type !== 'single_select') return null;

  for (const fromOption of previousHabit.options ?? []) {
    if (`${previousHabit.name}.${fromOption}` !== fromPath) continue;
    for (const toOption of nextHabit.options ?? []) {
      if (`${nextHabit.name}.${toOption}` === toPath) {
        return { habit: nextHabit.name, fromOption, toOption };
      }
    }
  }

  return null;
}

function classifyConfigMigrations(
  migrations: ConfigMigrationTuple[],
  previousHabits: HabitDef[],
  nextHabits: HabitDef[],
): ClassifiedConfigMigrations {
  const previousByName = new Map(previousHabits.map((habit) => [habit.name, habit]));
  const nextByName = new Map(nextHabits.map((habit) => [habit.name, habit]));
  const habitRenames: ConfigMigrationTuple[] = [];
  const optionRenames: ClassifiedConfigMigrations['optionRenames'] = [];

  for (const [fromPath, toPath] of migrations) {
    const previousHabit = previousByName.get(fromPath);
    const nextHabit = nextByName.get(toPath);
    if (previousHabit && nextHabit) {
      habitRenames.push([fromPath, toPath]);
      continue;
    }

    for (const oldHabit of previousHabits) {
      for (const newHabit of nextHabits) {
        const optionRename = optionMigrationForHabitPair(fromPath, toPath, oldHabit, newHabit);
        if (optionRename) {
          optionRenames.push(optionRename);
        }
      }
    }
  }

  return { habitRenames, optionRenames };
}

function applyConfigDataMigrations(
  user: string,
  migrations: ConfigMigrationTuple[],
  previousHabits: HabitDef[],
  nextHabits: HabitDef[],
  habitRepository: HabitRepository,
): void {
  const { habitRenames, optionRenames } = classifyConfigMigrations(
    migrations,
    previousHabits,
    nextHabits,
  );

  for (const [fromHabit, toHabit] of habitRenames) {
    habitRepository.renameHabitData(user, fromHabit, toHabit);
  }
  for (const { habit, fromOption, toOption } of optionRenames) {
    habitRepository.renameDailySelectValue(user, habit, fromOption, toOption);
  }
}

export class ConfigService {
  static readonly ConfigValidationError = YAMLConfigParser.ConfigValidationError;

  constructor(
    private readonly repository = new ConfigRepository(),
    private readonly yamlConfigConvertor = new YAMLConfigConvertor(),
    private readonly habitRepository = new HabitRepository(),
  ) {}

  ensureConfigLayout(): void {
    this.repository.ensureLayout();
  }

  listUsers(): string[] {
    return this.repository.listUsers();
  }

  readUserConfigText(user: string): YAMLString | null {
    return this.repository.readUserConfigText(user);
  }

  writeUserConfigText(
    user: string,
    content: YAMLString,
  ): { ok: true } | { ok: false; error: string } {
    if (!this.repository.hasUserConfig(user)) {
      return { ok: false, error: 'config file not found' };
    }
    const validation = this.validateUserConfigText(user, content);
    if (!validation.ok) return validation;
    this.repository.writeUserConfigText(user, content);
    return { ok: true };
  }

  validateUserConfigText(
    user: string,
    content: YAMLString,
  ): { ok: true; config: UserConfig } | { ok: false; error: string } {
    try {
      return { ok: true, config: new YAMLConfigParser(user).parse(content) };
    } catch (e) {
      if (e instanceof YAMLConfigParser.ConfigValidationError) {
        return { ok: false, error: e.message };
      }
      return { ok: false, error: e instanceof Error ? e.message : 'invalid config' };
    }
  }

  loadUserConfig(user: string): UserConfig | null {
    const text = this.repository.readUserConfigText(user);
    if (text == null) return null;

    return new YAMLConfigParser(user).parse(text);
  }

  createEmptyUserConfig(user: string): { ok: true; user: string } | { ok: false; error: string } {
    this.ensureConfigLayout();

    if (this.repository.hasUserConfig(user)) {
      return { ok: false, error: `user "${user}" already exists` };
    }

    const validation = this.validateUserConfigText(user, EMPTY_USER_CONFIG_TEXT);
    if (!validation.ok) return validation;
    this.repository.writeUserConfigText(user, EMPTY_USER_CONFIG_TEXT);

    return { ok: true, user };
  }

  renameUserConfig(
    fromUser: string,
    toUser: string,
  ): { ok: true; user: string } | { ok: false; error: string } {
    if (!this.repository.hasUserConfig(fromUser)) return { ok: false, error: 'user not found' };

    if (this.repository.hasUserConfig(toUser)) {
      return { ok: false, error: `user "${toUser}" already exists` };
    }

    this.repository.renameUserConfig(fromUser, toUser);

    return { ok: true, user: toUser };
  }

  deleteUserConfig(user: string): { ok: true; user: string } | { ok: false; error: string } {
    if (!this.repository.hasUserConfig(user)) return { ok: false, error: 'user not found' };
    this.repository.deleteUserConfig(user);
    return { ok: true, user };
  }

  getUserConfig({ user }: GetUserConfigInput): ConfigServiceResult<UserConfigGetResponse> {
    if (!isSafeConfigUserId(user)) {
      return { status: 400, body: { error: 'invalid user' } };
    }
    const text = this.readUserConfigText(user);
    if (text == null) return { status: 404, body: { error: 'user not found' } };
    const config = this.loadUserConfig(user);
    if (!config) return { status: 404, body: { error: 'user not found' } };
    return {
      status: 200,
      body: {
        text,
        ...configResponseParts(user, text),
      },
    };
  }

  putUserConfig({
    user,
    body = {},
  }: PutUserConfigInput): ConfigServiceResult<UserConfigPutResponse> {
    if (!isSafeConfigUserId(user)) {
      return { status: 400, body: { error: 'invalid user' } };
    }

    let text: YAMLString;
    if (typeof body.text === 'string') {
      text = yamlString(body.text);
    } else if (body.config != null) {
      try {
        text = this.yamlConfigConvertor.convert(body.config as UserConfig);
      } catch (e) {
        return {
          status: 400,
          body: { error: e instanceof Error ? e.message : 'invalid config' },
        };
      }
    } else {
      return { status: 400, body: { error: 'text or config is required' } };
    }

    const migrations = body.migrations == null ? null : parseConfigMigrationTuples(body.migrations);
    if (migrations == null && body.migrations != null) {
      return { status: 400, body: { error: 'migrations must be an array of string tuples' } };
    }
    const deletions = body.deletions == null ? null : parseConfigDeletions(body.deletions);
    if (deletions == null && body.deletions != null) {
      return { status: 400, body: { error: 'deletions must be an array of strings' } };
    }

    const previousConfig = this.loadUserConfig(user);
    if (!previousConfig) return { status: 404, body: { error: 'user not found' } };
    const previousText = this.readUserConfigText(user);
    if (previousText == null) return { status: 404, body: { error: 'user not found' } };
    const configMigrations = migrations ?? buildConfigMigrations(previousText, text);
    const configDeletions = deletions ?? buildConfigDeletions(previousText, text);

    const out = this.writeUserConfigText(user, text);
    if (!out.ok) {
      return { status: 400, body: { error: out.error } };
    }
    if (configMigrations.length > 0) {
      const nextConfig = this.loadUserConfig(user);
      if (!nextConfig) return { status: 404, body: { error: 'user not found' } };
      applyConfigDataMigrations(
        user,
        configMigrations,
        previousConfig.habits,
        nextConfig.habits,
        this.habitRepository,
      );
    }
    if (configDeletions.length > 0) {
      applyConfigDataDeletions(user, configDeletions, previousConfig.habits, this.habitRepository);
    }

    return { status: 200, body: { ok: true, user } };
  }
}
