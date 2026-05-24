import yaml from 'js-yaml';

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
