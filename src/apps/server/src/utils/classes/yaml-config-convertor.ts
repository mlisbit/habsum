// Converts the server UserConfig model into persisted YAML habit config text.
import yaml from 'js-yaml';
import { yamlString, type YAMLString } from '@habsum/types/common/misc';
import type { UserConfig, HabitDef, HabitInsight } from '../../types/userConfig.js';

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
  if (habit.repeat != null && habit.repeat.length > 0 && habit.repeat.length < 7) {
    def.repeat = habit.repeat;
  }
  if (habit.type === 'single_select') {
    def.options = habit.settings.options;
    if (habit.settings.theme) def.theme = habit.settings.theme;
  } else if (habit.type === 'summation') {
    if (habit.settings.goal != null) def.goal = habit.settings.goal;
    if (habit.settings.summationOptions) {
      def.summation_options = habit.settings.summationOptions.increments;
    }
  }
  if (habit.type !== 'text' && habit.data_visualization) {
    def.data_visualization = habit.data_visualization;
  }
  if (habit.type !== 'text' && (habit.insights?.length ?? 0) > 0) {
    const order: HabitInsight[] = ['current_streak', 'longest_streak', 'average'];
    def.insights = order.filter((insight) => habit.insights?.includes(insight));
  }
  if (habit.type !== 'text' && habit.streak_options) {
    def.streak_options = {
      ...(habit.type === 'single_select' ? { options: habit.streak_options.options } : {}),
      frequency: habit.streak_options.frequency,
    };
  }
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

    if (key === 'data_visualization' && value != null && typeof value === 'object') {
      const dataVisualization = value as HabitDef['data_visualization'];
      lines.push('data_visualization:');
      if (dataVisualization?.heatmap !== undefined) lines.push('  heatmap:');
      if (dataVisualization?.bargraph) {
        lines.push('  bargraph:');
        lines.push(`    period: ${dataVisualization.bargraph.period}`);
      }
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

export default class YAMLConfigConvertor {
  convert(config: UserConfig): YAMLString {
    const rootEntries: Record<string, unknown> = {};
    if (config.includeAbsentDaysInAverage) {
      rootEntries.include_absent_days_in_average = true;
    }

    const habitBlocks = config.habits.map(dumpHabitBlock);
    const habitsYaml = `habits:\n${habitBlocks.join('\n\n')}`;
    const restEntries = Object.entries(rootEntries);
    if (restEntries.length === 0) return yamlString(`${habitsYaml}\n`);

    const restYaml = yaml.dump(Object.fromEntries(restEntries), YAML_DUMP_OPTS).trimEnd();
    return yamlString(`${restYaml}\n\n${habitsYaml}\n`);
  }
}
