import yaml from 'js-yaml';
import type { HabitType } from '@habsum/types/common/habit';
import {
  yamlString,
  type UserConfigDeletion,
  type UserConfigJson,
  type UserConfigJsonHabit,
  type UserConfigMigration,
  type YAMLString,
} from '@habsum/types/common/misc';
import type { HabitDef, UserConfig } from '../types/userConfig.js';
import YAMLConfigParser from './classes/yaml-config-parser.js';

type RawHabitEntry = {
  name: string;
  type: HabitType;
  optionLabels: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseConfigRoot(text: YAMLString): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    throw new Error('invalid yaml');
  }
  if (parsed == null) return {};
  if (!isRecord(parsed)) {
    throw new Error('config must be a yaml mapping');
  }
  return parsed;
}

function parseHabitType(def: Record<string, unknown>): HabitType {
  if (def.type === 'single_select' || def.type === 'text') return def.type;
  return 'summation';
}

function parseConfigHabitMigrationEntries(text: YAMLString): RawHabitEntry[] {
  const parsed = parseConfigRoot(text);
  const habits = parsed.habits;
  if (habits == null) return [];
  if (!isRecord(habits)) {
    throw new Error('habits must be a yaml mapping');
  }
  return Object.entries(habits).map(([name, def]) => {
    if (!isRecord(def)) {
      throw new Error(`habit "${name}" must be a yaml mapping`);
    }
    const type = parseHabitType(def);
    const optionLabels =
      type === 'single_select' && Array.isArray(def.options)
        ? def.options.flatMap((option) =>
            typeof option === 'string'
              ? [option]
              : isRecord(option) && typeof option.label === 'string'
                ? [option.label]
                : [],
          )
        : [];
    return { name, type, optionLabels };
  });
}

export function getConfigJson(user: string, text: YAMLString): UserConfigJson {
  try {
    const config = new YAMLConfigParser(user).parse(text);
    return {
      user: config.user,
      includeAbsentDaysInAverage: config.includeAbsentDaysInAverage,
      habits: config.habits.map(habitDefToConfigJson),
    };
  } catch (e) {
    if (e instanceof YAMLConfigParser.ConfigValidationError) throw new Error(e.message);
    throw e;
  }
}

function habitDefToConfigJson(habit: HabitDef): UserConfigJsonHabit {
  const shared = {
    name: habit.name,
    type: habit.type,
    repeat: habit.repeat,
    ...(habit.type === 'text' ? { reset: habit.settings.reset } : {}),
    ...(habit.data_visualization ? { data_visualization: habit.data_visualization } : {}),
    ...(habit.insights.length > 0 ? { insights: habit.insights } : {}),
    ...(habit.streak_options ? { streak_options: habit.streak_options } : {}),
  };

  if (habit.type === 'single_select') {
    return {
      ...shared,
      type: habit.type,
      goal: null,
      options: habit.settings.options,
      ...(habit.settings.theme ? { theme: habit.settings.theme } : {}),
    };
  }
  if (habit.type === 'text') {
    return {
      ...shared,
      type: habit.type,
      goal: null,
    };
  }

  return {
    ...shared,
    type: habit.type,
    goal: habit.settings.goal,
    ...(habit.settings.summationOptions
      ? { summationOptions: habit.settings.summationOptions }
      : {}),
  };
}

export function getUserConfigJsonFromText(user: string, text: YAMLString): UserConfigJson {
  return getConfigJson(user, text);
}

export function getUserConfigFromJson(config: UserConfigJson): UserConfig {
  const habits = Object.fromEntries(
    config.habits.map((habit) => {
      const { name, summationOptions, ...definition } = habit;
      return [
        name,
        {
          ...definition,
          ...(summationOptions ? { summation_options: summationOptions } : {}),
        },
      ];
    }),
  );
  return new YAMLConfigParser(config.user).parse(
    yamlString(
      yaml.dump({
        include_absent_days_in_average: config.includeAbsentDaysInAverage,
        habits,
      }),
    ),
  );
}

function parseConfigMigrationEntries(text: YAMLString): RawHabitEntry[] {
  return parseConfigHabitMigrationEntries(text);
}

function migrationPath(habitName: string, optionName?: string): string {
  return optionName == null ? habitName : `${habitName}.${optionName}`;
}

function renamedHabitPairs(
  previousEntries: RawHabitEntry[],
  nextEntries: RawHabitEntry[],
): Array<[RawHabitEntry, RawHabitEntry]> {
  const previousByName = new Map(previousEntries.map((entry) => [entry.name, entry]));
  const nextByName = new Map(nextEntries.map((entry) => [entry.name, entry]));
  const removed = previousEntries.filter((entry) => !nextByName.has(entry.name));
  const added = nextEntries.filter((entry) => !previousByName.has(entry.name));
  if (removed.length === 0 || removed.length !== added.length) return [];

  const pairs: Array<[RawHabitEntry, RawHabitEntry]> = [];
  const usedAdded = new Set<string>();
  for (const previous of removed) {
    const previousIndex = previousEntries.findIndex((entry) => entry.name === previous.name);
    const byIndex = nextEntries[previousIndex];
    const next =
      byIndex != null &&
      added.some((entry) => entry.name === byIndex.name) &&
      byIndex.type === previous.type &&
      !usedAdded.has(byIndex.name)
        ? byIndex
        : added.find((entry) => entry.type === previous.type && !usedAdded.has(entry.name));
    if (!next) continue;
    usedAdded.add(next.name);
    pairs.push([previous, next]);
  }
  return pairs;
}

function optionMigrations(
  previousHabit: RawHabitEntry,
  nextHabit: RawHabitEntry,
): UserConfigMigration[] {
  if (previousHabit.type !== 'single_select' || nextHabit.type !== 'single_select') return [];
  if (previousHabit.optionLabels.length !== nextHabit.optionLabels.length) return [];

  const previousOptions = new Set(previousHabit.optionLabels);
  const nextOptions = new Set(nextHabit.optionLabels);
  const removed = previousHabit.optionLabels.filter((option) => !nextOptions.has(option));
  const added = nextHabit.optionLabels.filter((option) => !previousOptions.has(option));
  if (removed.length === 0 || removed.length !== added.length) return [];

  return removed.map((option, index) => [
    migrationPath(previousHabit.name, option),
    migrationPath(nextHabit.name, added[index]),
  ]);
}

function removedOptionsWithoutRename(
  previousHabit: RawHabitEntry,
  nextHabit: RawHabitEntry,
): string[] {
  if (previousHabit.type !== 'single_select' || nextHabit.type !== 'single_select') return [];

  const previousOptions = new Set(previousHabit.optionLabels);
  const nextOptions = new Set(nextHabit.optionLabels);
  const removed = previousHabit.optionLabels.filter((option) => !nextOptions.has(option));
  const added = nextHabit.optionLabels.filter((option) => !previousOptions.has(option));
  const looksLikeRename =
    previousHabit.optionLabels.length === nextHabit.optionLabels.length &&
    removed.length > 0 &&
    removed.length === added.length;

  return looksLikeRename ? [] : removed;
}

export function getConfigMigrations(
  previousText: YAMLString,
  nextText: YAMLString,
): UserConfigMigration[] {
  const previousEntries = parseConfigMigrationEntries(previousText);
  const nextEntries = parseConfigMigrationEntries(nextText);
  const migrations: UserConfigMigration[] = [];
  const nextByName = new Map(nextEntries.map((entry) => [entry.name, entry]));

  for (const previous of previousEntries) {
    const next = nextByName.get(previous.name);
    if (next) migrations.push(...optionMigrations(previous, next));
  }

  for (const [previous, next] of renamedHabitPairs(previousEntries, nextEntries)) {
    migrations.push([migrationPath(previous.name), migrationPath(next.name)]);
    migrations.push(...optionMigrations(previous, next));
  }

  return migrations;
}

export function getConfigDeletions(
  previousText: YAMLString,
  nextText: YAMLString,
): UserConfigDeletion[] {
  const previousEntries = parseConfigMigrationEntries(previousText);
  const nextEntries = parseConfigMigrationEntries(nextText);
  const nextByName = new Map(nextEntries.map((entry) => [entry.name, entry]));
  const deletions: UserConfigDeletion[] = [];

  for (const previous of previousEntries) {
    if (previous.type !== 'single_select') continue;
    const next = nextByName.get(previous.name);
    if (!next || next.type !== 'single_select') continue;

    for (const option of removedOptionsWithoutRename(previous, next)) {
      deletions.push(migrationPath(previous.name, option));
    }
  }

  return deletions;
}
