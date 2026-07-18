// Service layer for user-scoped config HTTP requests and response orchestration.
import type {
  UserConfigGetResponse,
  UserConfigPutRequest,
  UserConfigPutResponse,
} from '@habsum/types/common/misc';
import {
  buildConfigDeletions,
  buildConfigMigrations,
  configResponseParts,
  serializeConfigJson,
} from '../config-editor.js';
import { deleteDailySelectValue, renameDailySelectValue, renameHabitData } from '../db.js';
import { isSafeConfigUserId } from '../request-helpers.js';
import type { HabitDef } from '../types/userConfig.js';
import { YamlUserConfigService } from './yaml-user-config-service.js';

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
): void {
  for (const path of deletions) {
    const deletion = optionDeletionForPath(path, previousHabits);
    if (!deletion) continue;
    deleteDailySelectValue(user, deletion.habit, deletion.option);
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
): void {
  const { habitRenames, optionRenames } = classifyConfigMigrations(
    migrations,
    previousHabits,
    nextHabits,
  );

  for (const [fromHabit, toHabit] of habitRenames) {
    renameHabitData(user, fromHabit, toHabit);
  }
  for (const { habit, fromOption, toOption } of optionRenames) {
    renameDailySelectValue(user, habit, fromOption, toOption);
  }
}

export class ConfigService {
  constructor(private readonly yamlUserConfigService = new YamlUserConfigService()) {}

  getUserConfig({ user }: GetUserConfigInput): ConfigServiceResult<UserConfigGetResponse> {
    if (!isSafeConfigUserId(user)) {
      return { status: 400, body: { error: 'invalid user' } };
    }
    const text = this.yamlUserConfigService.readUserConfigFileText(user);
    if (text == null) return { status: 404, body: { error: 'user not found' } };
    const config = this.yamlUserConfigService.loadUserConfig(user);
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

    let text: string;
    if (typeof body.text === 'string') {
      text = body.text;
    } else if (body.config != null) {
      try {
        text = serializeConfigJson(body.config);
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

    const previousConfig = this.yamlUserConfigService.loadUserConfig(user);
    if (!previousConfig) return { status: 404, body: { error: 'user not found' } };
    const previousText = this.yamlUserConfigService.readUserConfigFileText(user);
    if (previousText == null) return { status: 404, body: { error: 'user not found' } };
    const configMigrations = migrations ?? buildConfigMigrations(previousText, text);
    const configDeletions = deletions ?? buildConfigDeletions(previousText, text);

    const out = this.yamlUserConfigService.writeUserConfigFileText(user, text);
    if (!out.ok) {
      return { status: 400, body: { error: out.error } };
    }
    if (configMigrations.length > 0) {
      const nextConfig = this.yamlUserConfigService.loadUserConfig(user);
      if (!nextConfig) return { status: 404, body: { error: 'user not found' } };
      applyConfigDataMigrations(user, configMigrations, previousConfig.habits, nextConfig.habits);
    }
    if (configDeletions.length > 0) {
      applyConfigDataDeletions(user, configDeletions, previousConfig.habits);
    }

    return { status: 200, body: { ok: true, user } };
  }
}
