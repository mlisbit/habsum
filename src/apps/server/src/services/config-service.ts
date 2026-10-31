import { yamlString, type UserConfigJson, type YAMLString } from '@habsum/types/common/misc';
import {
  getConfigDeletions,
  getConfigJson,
  getConfigMigrations,
  getUserConfigFromJson,
} from '../utils/config-editor-utils.js';
import { ConfigRepository } from '../repositories/config-repository.js';
import { UserHabitRepository } from '../repositories/user-habit-repository.js';
import type { UserConfig, HabitDef } from '../types/userConfig.js';
import YAMLConfig from '../utils/yaml-config/yaml-config.js';
import { isSafeConfigUserId } from '../utils/request-utils.js';
import ServiceError from '../utils/classes/service-error.js';

type GetUserConfigInput = {
  user: string;
};

type PutUserConfigInput = {
  user: string;
  body?: {
    text?: unknown;
    config?: unknown;
    migrations?: unknown;
    deletions?: unknown;
  };
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
    for (const { label: option } of habit.settings.options) {
      if (`${habit.name}.${option}` === path) {
        return { habit: habit.name, option };
      }
    }
  }
  return null;
}

function applyConfigDataDeletions(
  deletions: string[],
  previousHabits: HabitDef[],
  habitRepository: UserHabitRepository,
): void {
  for (const path of deletions) {
    const deletion = optionDeletionForPath(path, previousHabits);
    if (!deletion) continue;
    habitRepository.applyConfigMutation({
      kind: 'delete_select_value',
      habit: deletion.habit,
      value: deletion.option,
    });
  }
}

function optionMigrationForHabitPair(
  fromPath: string,
  toPath: string,
  previousHabit: HabitDef,
  nextHabit: HabitDef,
): { habit: string; fromOption: string; toOption: string } | null {
  if (previousHabit.type !== 'single_select' || nextHabit.type !== 'single_select') return null;

  for (const { label: fromOption } of previousHabit.settings.options) {
    if (`${previousHabit.name}.${fromOption}` !== fromPath) continue;
    for (const { label: toOption } of nextHabit.settings.options) {
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
  migrations: ConfigMigrationTuple[],
  previousHabits: HabitDef[],
  nextHabits: HabitDef[],
  habitRepository: UserHabitRepository,
): void {
  const { habitRenames, optionRenames } = classifyConfigMigrations(
    migrations,
    previousHabits,
    nextHabits,
  );

  for (const [fromHabit, toHabit] of habitRenames) {
    habitRepository.applyConfigMutation({
      kind: 'rename_habit',
      from: fromHabit,
      to: toHabit,
    });
  }
  for (const { habit, fromOption, toOption } of optionRenames) {
    habitRepository.applyConfigMutation({
      kind: 'rename_select_value',
      habit,
      from: fromOption,
      to: toOption,
    });
  }
}

export class ConfigService {
  static readonly ConfigValidationError = YAMLConfig.ConfigValidationError;

  constructor(
    private readonly repository = new ConfigRepository(),
    private readonly yamlConfig = new YAMLConfig(),
    private readonly getUserHabitRepository: (userId: string) => UserHabitRepository = (userId) =>
      new UserHabitRepository(userId, this),
  ) {}

  ensureConfigLayout(): void {
    this.repository.ensureLayout();
  }

  listConfiguredUsers(): string[] {
    return this.repository.listConfiguredUsers();
  }

  readUserConfigText(user: string): YAMLString | null {
    return this.repository.readUserConfigText(user);
  }

  writeUserConfigText(
    user: string,
    content: YAMLString,
  ): { ok: true } | { ok: false; error: string } {
    if (!this.repository.hasUserConfig(user)) {
      return { ok: false, error: 'habit config not found' };
    }
    const validation = this.validateUserConfigText(content);
    if (!validation.ok) return validation;
    const yamlConfig = new YAMLConfig(content);
    this.repository.writeUserConfigText(user, yamlConfig.getVersionedText(content));
    return { ok: true };
  }

  validateUserConfigText(
    content: YAMLString,
  ): { ok: true; config: UserConfig } | { ok: false; error: string } {
    try {
      const yamlConfig = new YAMLConfig(content);
      return { ok: true, config: yamlConfig.parse() };
    } catch (e) {
      if (e instanceof YAMLConfig.ConfigValidationError) {
        return { ok: false, error: e.message };
      }
      return { ok: false, error: e instanceof Error ? e.message : 'invalid config' };
    }
  }

  loadUserConfig(user: string): UserConfig | null {
    const text = this.repository.readUserConfigText(user);
    if (text == null) return null;

    return new YAMLConfig(text).parse();
  }

  createEmptyUserConfig(user: string): { ok: true; user: string } | { ok: false; error: string } {
    this.ensureConfigLayout();

    if (this.repository.hasUserConfig(user)) {
      return { ok: false, error: `user "${user}" already exists` };
    }

    const text = this.yamlConfig.getSerializer().serialize({
      includeAbsentDaysInAverage: false,
      habits: [],
    });
    const validation = this.validateUserConfigText(text);
    if (!validation.ok) return validation;
    this.repository.writeUserConfigText(user, text);

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

  getUserConfig({ user }: GetUserConfigInput) {
    if (!isSafeConfigUserId(user)) {
      throw new ServiceError('bad_request', 'invalid user');
    }
    const text = this.readUserConfigText(user);
    if (text == null) throw new ServiceError('not_found', 'user not found');
    const config = this.loadUserConfig(user);
    if (!config) throw new ServiceError('not_found', 'user not found');
    return {
      text,
      config: getConfigJson(text),
    };
  }

  putUserConfig({ user, body = {} }: PutUserConfigInput) {
    if (!isSafeConfigUserId(user)) {
      throw new ServiceError('bad_request', 'invalid user');
    }

    let text: YAMLString;
    if (typeof body.text === 'string') {
      try {
        const content = yamlString(body.text);
        const config = new YAMLConfig(content).parse();
        text = this.yamlConfig.getSerializer().serialize(config);
      } catch (e) {
        throw new ServiceError('bad_request', e instanceof Error ? e.message : 'invalid config');
      }
    } else if (body.config != null) {
      try {
        text = this.yamlConfig
          .getSerializer()
          .serialize(getUserConfigFromJson(body.config as UserConfigJson));
      } catch (e) {
        throw new ServiceError('bad_request', e instanceof Error ? e.message : 'invalid config');
      }
    } else {
      throw new ServiceError('bad_request', 'text or config is required');
    }

    const migrations = body.migrations == null ? null : parseConfigMigrationTuples(body.migrations);
    if (migrations == null && body.migrations != null) {
      throw new ServiceError('bad_request', 'migrations must be an array of string tuples');
    }
    const deletions = body.deletions == null ? null : parseConfigDeletions(body.deletions);
    if (deletions == null && body.deletions != null) {
      throw new ServiceError('bad_request', 'deletions must be an array of strings');
    }

    const previousConfig = this.loadUserConfig(user);
    if (!previousConfig) throw new ServiceError('not_found', 'user not found');
    const previousText = this.readUserConfigText(user);
    if (previousText == null) throw new ServiceError('not_found', 'user not found');
    const configMigrations = migrations ?? getConfigMigrations(previousText, text);
    const configDeletions = deletions ?? getConfigDeletions(previousText, text);

    const out = this.writeUserConfigText(user, text);
    if (!out.ok) {
      throw new ServiceError('bad_request', out.error);
    }
    const habitRepository = this.getUserHabitRepository(user);
    if (configMigrations.length > 0) {
      applyConfigDataMigrations(
        configMigrations,
        previousConfig.habits,
        habitRepository.userConfig.habits,
        habitRepository,
      );
    }
    if (configDeletions.length > 0) {
      applyConfigDataDeletions(configDeletions, previousConfig.habits, habitRepository);
    }

    return { ok: true as const, user };
  }
}
