import yaml from 'js-yaml';
import type { UserConfigDeletion, UserConfigMigration } from '@habsum/types/common/misc';

export type ConfigHabitCard = {
  name: string;
  type: 'summation' | 'single_select';
  goal: number | null;
  optionLabels?: string[];
  hasSummationOptions: boolean;
  hasHistory: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseHabitType(def: Record<string, unknown>): 'summation' | 'single_select' {
  const raw = def.type;
  return raw === 'single_select' ? 'single_select' : 'summation';
}

function parseHabitCard(name: string, def: unknown): ConfigHabitCard {
  if (!isRecord(def)) {
    throw new Error(`habit "${name}" must be a yaml mapping`);
  }
  const type = parseHabitType(def);
  const goalRaw = def.goal;
  const goal = typeof goalRaw === 'number' && Number.isFinite(goalRaw) ? Math.trunc(goalRaw) : null;
  const optionLabels =
    type === 'single_select' && Array.isArray(def.options)
      ? def.options.filter((x): x is string => typeof x === 'string')
      : undefined;
  const summationRaw = def.summation_options ?? def.summationOptions;
  const hasSummationOptions = type === 'summation' && summationRaw != null;
  const hasHistory = isRecord(def.history);

  return {
    name,
    type,
    goal,
    optionLabels,
    hasSummationOptions,
    hasHistory,
  };
}

export function parseConfigHabitCards(text: string): ConfigHabitCard[] {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    throw new Error('invalid yaml');
  }
  if (parsed == null) return [];
  if (!isRecord(parsed)) {
    throw new Error('config must be a yaml mapping');
  }
  const habits = parsed.habits;
  if (habits == null) return [];
  if (!isRecord(habits)) {
    throw new Error('habits must be a yaml mapping');
  }

  return Object.entries(habits).map(([name, def]) => parseHabitCard(name, def));
}

export function habitOrderKey(names: string[]): string {
  return names.join('\0');
}

type RawHabitEntry = {
  name: string;
  type: 'summation' | 'single_select';
  optionLabels: string[];
};

function parseConfigMigrationEntries(text: string): RawHabitEntry[] {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    throw new Error('invalid yaml');
  }
  if (parsed == null) return [];
  if (!isRecord(parsed)) {
    throw new Error('config must be a yaml mapping');
  }
  const habits = parsed.habits;
  if (habits == null) return [];
  if (!isRecord(habits)) {
    throw new Error('habits must be a yaml mapping');
  }

  return Object.entries(habits).map(([name, def]) => {
    const card = parseHabitCard(name, def);
    return {
      name,
      type: card.type,
      optionLabels: card.optionLabels ?? [],
    };
  });
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

const YAML_DUMP_OPTS = { lineWidth: -1, noRefs: true };

/** Characters or shapes that require quoting a YAML plain scalar. */
const YAML_SCALAR_QUOTE_RE = /[\s:#\[\]{},'"\\&*!?|>%@`-]|^[-?]|^$/;

/** Format a string for inline YAML lists; avoids js-yaml quoting yes/no/on/off as booleans. */
export function formatYamlStringScalar(value: string): string {
  if (/^\d+$/.test(value)) {
    return `'${value}'`;
  }
  if (!YAML_SCALAR_QUOTE_RE.test(value)) {
    return value;
  }
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  return JSON.stringify(value);
}

function formatStringListInline(values: string[]): string {
  return `[${values.map(formatYamlStringScalar).join(', ')}]`;
}

function formatSummationOptionsInline(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const parts: string[] = [];
  for (const item of raw) {
    if (typeof item === 'number' && Number.isFinite(item)) {
      parts.push(String(Math.trunc(item)));
      continue;
    }
    if (typeof item === 'string') {
      parts.push(formatYamlStringScalar(item));
      continue;
    }
    return null;
  }
  return `[${parts.join(', ')}]`;
}

function dumpHabitDef(def: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(def)) {
    if (key === 'options' && Array.isArray(value) && value.every((x) => typeof x === 'string')) {
      lines.push(`options: ${formatStringListInline(value)}`);
      continue;
    }

    if (key === 'summation_options' || key === 'summationOptions') {
      const inline = formatSummationOptionsInline(value);
      if (inline) {
        lines.push(`summation_options: ${inline}`);
        continue;
      }
    }

    lines.push(yaml.dump({ [key]: value }, YAML_DUMP_OPTS).trimEnd());
  }

  return lines.join('\n');
}

function dumpHabitBlock(name: string, def: unknown): string {
  if (!isRecord(def)) {
    throw new Error(`habit "${name}" must be a yaml mapping`);
  }
  const inner = dumpHabitDef(def)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `  ${name}:\n${inner}`;
}

/** Serializes config YAML with a blank line between each habit entry. */
export function dumpConfigYaml(parsed: Record<string, unknown>, habitOrder?: string[]): string {
  const habits = parsed.habits;
  if (!isRecord(habits)) {
    return `${yaml.dump(parsed, { lineWidth: -1, noRefs: true }).trimEnd()}\n`;
  }

  const names =
    habitOrder != null &&
    habitOrder.length === Object.keys(habits).length &&
    habitOrder.every((name) => Object.hasOwn(habits, name))
      ? habitOrder
      : Object.keys(habits);

  const habitBlocks = names.map((name) => dumpHabitBlock(name, habits[name]));
  const habitsYaml = `habits:\n${habitBlocks.join('\n\n')}`;

  const otherEntries = Object.entries(parsed).filter(([key]) => key !== 'habits');
  if (otherEntries.length === 0) {
    return `${habitsYaml}\n`;
  }

  const restYaml = yaml
    .dump(Object.fromEntries(otherEntries), { lineWidth: -1, noRefs: true })
    .trimEnd();
  return `${restYaml}\n\n${habitsYaml}\n`;
}

export function reorderHabitsInConfigYaml(text: string, orderedNames: string[]): string {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    throw new Error('invalid yaml');
  }
  if (!isRecord(parsed)) {
    throw new Error('config must be a yaml mapping');
  }
  const habits = parsed.habits;
  if (habits == null) {
    throw new Error('habits mapping is required');
  }
  if (!isRecord(habits)) {
    throw new Error('habits must be a yaml mapping');
  }

  const existingNames = Object.keys(habits);
  if (orderedNames.length !== existingNames.length) {
    throw new Error('habit order must include every habit');
  }
  const missing = orderedNames.filter((name) => !Object.hasOwn(habits, name));
  if (missing.length > 0) {
    throw new Error(`unknown habit: ${missing[0]}`);
  }

  const reordered: Record<string, unknown> = {};
  for (const name of orderedNames) {
    reordered[name] = habits[name];
  }
  parsed.habits = reordered;

  return dumpConfigYaml(parsed, orderedNames);
}
