import yaml from 'js-yaml';
import type {
  UserConfigDeletion,
  UserConfigJson,
  UserConfigMigration,
} from '@habsum/types/common/misc';
import { YAMLConfigParser } from './utils/yaml-config-parser.js';

type RawHabitEntry = {
  name: string;
  type: 'summation' | 'single_select';
  optionLabels: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseConfigRoot(text: string): Record<string, unknown> {
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

function parseHabitType(def: Record<string, unknown>): 'summation' | 'single_select' {
  return def.type === 'single_select' ? 'single_select' : 'summation';
}

function parseConfigHabitMigrationEntries(text: string): RawHabitEntry[] {
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
        ? def.options.filter((x): x is string => typeof x === 'string')
        : [];
    return { name, type, optionLabels };
  });
}

export function parseConfigJson(user: string, text: string): UserConfigJson {
  try {
    return new YAMLConfigParser(user).parse(text);
  } catch (e) {
    if (e instanceof YAMLConfigParser.ConfigValidationError) throw new Error(e.message);
    throw e;
  }
}

export function configResponseParts(
  user: string,
  text: string,
): {
  config: UserConfigJson;
} {
  return {
    config: parseConfigJson(user, text),
  };
}

function parseConfigMigrationEntries(text: string): RawHabitEntry[] {
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

export function buildConfigMigrations(
  previousText: string,
  nextText: string,
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

export function buildConfigDeletions(previousText: string, nextText: string): UserConfigDeletion[] {
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
