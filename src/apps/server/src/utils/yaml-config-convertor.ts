// Converts the server UserConfig model into persisted YAML habit config text.
import yaml from 'js-yaml';
import type { UserConfig, HabitDef } from '../types/userConfig.js';

const YAML_DUMP_OPTS = { lineWidth: -1, noRefs: true };
const YAML_SCALAR_QUOTE_RE = /[\s:#\[\]{},'"\\&*!?|>%@`-]|^[-?]|^$/;

function formatYamlStringScalar(value: string): string {
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

function habitToYamlDef(habit: HabitDef): Record<string, unknown> {
  const def: Record<string, unknown> = { type: habit.type };
  if (habit.goal != null) def.goal = habit.goal;
  if (habit.repeat != null && habit.repeat.length > 0 && habit.repeat.length < 7) {
    def.repeat = habit.repeat;
  }
  if (habit.type === 'single_select') {
    def.options = habit.options ?? [];
    if (habit.theme != null && habit.theme.trim() !== '') def.theme = habit.theme;
  }
  if (habit.type === 'summation' && habit.summationOptions) {
    def.summation_options = habit.summationOptions.increments;
  }
  if (habit.history) def.history = habit.history;
  if (habit.streak) def.streak = habit.streak;
  return def;
}

function dumpHabitDef(def: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(def)) {
    if (key === 'options' && Array.isArray(value) && value.every((x) => typeof x === 'string')) {
      lines.push(`options: ${formatStringListInline(value)}`);
      continue;
    }

    if (key === 'summation_options') {
      const inline = formatSummationOptionsInline(value);
      if (inline) {
        lines.push(`summation_options: ${inline}`);
        continue;
      }
    }

    if (key === 'repeat' && Array.isArray(value) && value.every((x) => typeof x === 'string')) {
      lines.push(`repeat: ${formatStringListInline(value)}`);
      continue;
    }

    lines.push(yaml.dump({ [key]: value }, YAML_DUMP_OPTS).trimEnd());
  }

  return lines.join('\n');
}

function dumpHabitBlock(habit: HabitDef): string {
  const inner = dumpHabitDef(habitToYamlDef(habit))
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `  ${habit.name}:\n${inner}`;
}

export class YAMLConfigConvertor {
  convert(config: UserConfig): string {
    const rootEntries: Record<string, unknown> = {};
    if (config.includeAbsentDaysInAverage) {
      rootEntries.include_absent_days_in_average = true;
    }

    const habitBlocks = config.habits.map(dumpHabitBlock);
    const habitsYaml = `habits:\n${habitBlocks.join('\n\n')}`;
    const restEntries = Object.entries(rootEntries);
    if (restEntries.length === 0) return `${habitsYaml}\n`;

    const restYaml = yaml.dump(Object.fromEntries(restEntries), YAML_DUMP_OPTS).trimEnd();
    return `${restYaml}\n\n${habitsYaml}\n`;
  }
}
