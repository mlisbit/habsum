import {
  isHabitTheme,
  parseSummationOptionsFromRaw,
  type HabitTheme,
  type HabitType,
  type SingleSelectOption,
} from '@habsum/types/common/habit';
import { DEFAULT_STREAK_FREQUENCY, formatStreakFrequency } from '@habsum/types/common/streak';
import yaml from 'js-yaml';
import type { YAMLString } from '@habsum/types/common/misc';
import {
  HABIT_REPEAT_DAYS,
  type ConfigData,
  type HabitDef,
  type HabitInsight,
  type RawHabitConfig,
  type RawUserConfig,
} from '../../../types/userConfig.js';
import {
  YAMLConfigValidationError,
  type YAMLConfigParser as YAMLConfigParserInterface,
} from '../types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeHabitType(raw: unknown, habitName: string): HabitType {
  if (raw == null) return 'summation';
  if (raw === 'summation' || raw === 'single_select' || raw === 'text') return raw;
  throw new YAMLConfigValidationError(
    `habit "${habitName}" type must be summation, single_select, or text`,
  );
}

function getHabitTheme(raw: unknown, habitName: string): HabitTheme | undefined {
  if (raw === undefined) return undefined;
  if (!isHabitTheme(raw)) {
    throw new YAMLConfigValidationError(`habit "${habitName}" theme must be "checkbox"`);
  }
  return raw;
}

const HABIT_REPEAT_DAY_SET = new Set<string>(HABIT_REPEAT_DAYS);

function normalizeWeekdaySchedule(
  raw: unknown,
  habitName: string,
  field: 'repeat' | 'reset',
): string[] {
  if (raw == null) return [...HABIT_REPEAT_DAYS];
  if (!Array.isArray(raw)) {
    throw new YAMLConfigValidationError(`habit "${habitName}" ${field} must be a yaml list`);
  }

  const days: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !HABIT_REPEAT_DAY_SET.has(item)) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" ${field} must only include monday, tuesday, wednesday, thursday, friday, saturday, sunday`,
      );
    }
    if (!days.includes(item)) days.push(item);
  }
  if (days.length === 0) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" ${field} must include at least one day`,
    );
  }
  return days;
}

function normalizeRepeat(raw: unknown, habitName: string): HabitDef['repeat'] {
  return normalizeWeekdaySchedule(raw, habitName, 'repeat');
}

function normalizeReset(raw: unknown, habitName: string): string[] {
  return normalizeWeekdaySchedule(raw, habitName, 'reset');
}

function normalizeStreakOptionsList(
  rawOptions: unknown,
  habitName: string,
  mainOptions: readonly string[],
  key: 'streak.options' | 'streak_options.options',
): string[] {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    throw new YAMLConfigValidationError(`habit "${habitName}" ${key} must be a non-empty array`);
  }
  const allowed = new Set(mainOptions);
  const options: string[] = [];
  const seen = new Set<string>();
  for (const item of rawOptions) {
    const normalized = typeof item === 'number' && Number.isFinite(item) ? String(item) : item;
    if (typeof normalized !== 'string' || normalized.length === 0) {
      throw new YAMLConfigValidationError(`habit "${habitName}" ${key} must be strings`);
    }
    if (!allowed.has(normalized)) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" ${key} entry "${normalized}" is not listed in habit options`,
      );
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    options.push(normalized);
  }

  if (options.length === 0) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" ${key} must list at least one habit option`,
    );
  }
  return options;
}

function normalizeStreakFrequency(raw: unknown, habitName: string, legacy = false): string {
  if (raw == null) return DEFAULT_STREAK_FREQUENCY;

  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak_options.frequency must be a string like "3d"`,
    );
  }

  const spec = raw.trim();
  const match = spec.match(legacy ? /^(\d+)d(?:\/1w)?$/ : /^(\d+)d$/);
  if (!match) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak_options.frequency must match Nd (e.g. "3d")`,
    );
  }

  const days = Number(match[1]);
  if (days < 1 || days > 7) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak_options.frequency day count must be between 1 and 7`,
    );
  }

  return formatStreakFrequency(days);
}

function getSingleSelectOptions(rawHabit: RawHabitConfig, habitName: string): SingleSelectOption[] {
  const raw = rawHabit.options;
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new YAMLConfigValidationError(`habit "${habitName}" options must be a yaml list`);
  }
  const labels = new Set<string>();
  const options = raw.map((item): SingleSelectOption => {
    const label = typeof item === 'string' ? item : isRecord(item) ? item.label : undefined;
    if (typeof label !== 'string' || label.trim() === '') {
      throw new YAMLConfigValidationError(`habit "${habitName}" options require a non-empty label`);
    }
    if (labels.has(label)) {
      throw new YAMLConfigValidationError(`habit "${habitName}" has duplicate option "${label}"`);
    }
    labels.add(label);
    const rawSentiment = isRecord(item) ? (item.sentiment ?? 'positive') : 'positive';
    const sentiment =
      rawSentiment === 'good' ? 'positive' : rawSentiment === 'bad' ? 'negative' : rawSentiment;
    if (sentiment !== 'positive' && sentiment !== 'negative') {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" option "${label}" sentiment must be positive or negative`,
      );
    }
    return { label, sentiment };
  });
  const legacyStreak = isRecord(rawHabit.streak_options)
    ? rawHabit.streak_options
    : isRecord(rawHabit.streak)
      ? rawHabit.streak
      : undefined;
  if (legacyStreak && Object.hasOwn(legacyStreak, 'options')) {
    if (raw.some((item) => isRecord(item) && Object.hasOwn(item, 'sentiment'))) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" cannot mix option sentiments with legacy streak options`,
      );
    }
    const eligible = new Set(
      normalizeStreakOptionsList(
        legacyStreak.options,
        habitName,
        [...labels],
        rawHabit.streak_options != null ? 'streak_options.options' : 'streak.options',
      ),
    );
    return options.map((option) => ({
      ...option,
      sentiment: eligible.has(option.label) ? 'positive' : 'negative',
    }));
  }
  return options;
}

function normalizeDataVisualization(
  raw: unknown,
  habitName: string,
): HabitDef['data_visualization'] | undefined {
  if (raw == null) return undefined;
  if (!isRecord(raw)) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" data_visualization must be a yaml mapping`,
    );
  }

  const dataVisualization: NonNullable<HabitDef['data_visualization']> = {};
  if (Object.hasOwn(raw, 'heatmap')) {
    if (raw.heatmap != null && !isRecord(raw.heatmap)) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" data_visualization.heatmap must be empty`,
      );
    }
    dataVisualization.heatmap = {};
  }
  if (Object.hasOwn(raw, 'bargraph')) {
    if (
      !isRecord(raw.bargraph) ||
      typeof raw.bargraph.period !== 'string' ||
      raw.bargraph.period.trim().length === 0
    ) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" data_visualization.bargraph.period must be a non-empty string`,
      );
    }
    dataVisualization.bargraph = { period: raw.bargraph.period };
  }
  return Object.keys(dataVisualization).length > 0 ? dataVisualization : undefined;
}

const HABIT_INSIGHTS = ['current_streak', 'longest_streak', 'average'] as const;

function canonicalizeInsights(insights: readonly HabitInsight[]): HabitInsight[] {
  return HABIT_INSIGHTS.filter((insight) => insights.includes(insight));
}

function normalizeInsights(
  raw: unknown,
  habitName: string,
  type: HabitDef['type'],
): HabitInsight[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new YAMLConfigValidationError(`habit "${habitName}" insights must be a yaml list`);
  }
  const insights: HabitInsight[] = [];
  for (const insight of raw) {
    if (!HABIT_INSIGHTS.some((candidate) => candidate === insight)) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" insights must only include current_streak, longest_streak, or average`,
      );
    }
    if (insight === 'average' && type !== 'summation') {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" average insight requires a summation habit`,
      );
    }
    if (!insights.includes(insight)) insights.push(insight);
  }
  return canonicalizeInsights(insights);
}

function normalizeStreakOptions(
  raw: unknown,
  habitName: string,
  type: HabitDef['type'],
  mainOptions: readonly string[],
): HabitDef['streak_options'] | undefined {
  if (raw == null) return undefined;
  if (!isRecord(raw)) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak_options must be a yaml mapping`,
    );
  }
  if (type === 'summation' && mainOptions.length === 0) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak_options requires a configured goal`,
    );
  }
  return {
    frequency: normalizeStreakFrequency(raw.frequency, habitName),
  };
}

function normalizeLegacyPresentation(
  rawHabit: RawHabitConfig,
  habitName: string,
  type: HabitDef['type'],
  mainOptions: readonly string[],
): Pick<HabitDef, 'data_visualization' | 'insights' | 'streak_options'> {
  const insights: HabitInsight[] = [];
  let dataVisualization: HabitDef['data_visualization'];
  if (rawHabit.history != null) {
    if (!isRecord(rawHabit.history) || typeof rawHabit.history.period !== 'string') {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" history.period must be a non-empty string`,
      );
    }
    const rawDisplays =
      rawHabit.history.displays == null
        ? [rawHabit.history.display ?? 'weekly_history']
        : rawHabit.history.displays;
    if (!Array.isArray(rawDisplays)) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" history.displays must be a yaml list`,
      );
    }
    dataVisualization = {};
    for (const display of rawDisplays) {
      if (display === 'heatmap') dataVisualization.heatmap = {};
      else if (display === 'weekly_history') {
        dataVisualization.bargraph = { period: rawHabit.history.period };
      } else {
        throw new YAMLConfigValidationError(
          `habit "${habitName}" history contains an unsupported display`,
        );
      }
    }
    const showAverage = rawHabit.history.show_average;
    if (showAverage === true || (showAverage == null && rawDisplays.includes('weekly_history'))) {
      if (type === 'summation') {
        insights.push('average');
        dataVisualization.bargraph ??= { period: rawHabit.history.period };
      }
    } else if (showAverage != null && typeof showAverage !== 'boolean') {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" history.show_average must be a boolean`,
      );
    }
  }

  let streakOptions: HabitDef['streak_options'];
  if (rawHabit.streak != null) {
    if (!isRecord(rawHabit.streak)) {
      throw new YAMLConfigValidationError(`habit "${habitName}" streak must be a yaml mapping`);
    }
    if (mainOptions.length === 0) {
      throw new YAMLConfigValidationError(`habit "${habitName}" streak requires a configured goal`);
    }
    streakOptions = {
      frequency: normalizeStreakFrequency(rawHabit.streak.frequency, habitName, true),
    };
    if (rawHabit.streak.show_current != null && typeof rawHabit.streak.show_current !== 'boolean') {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" streak.show_current must be a boolean`,
      );
    }
    if (rawHabit.streak.show_longest != null && typeof rawHabit.streak.show_longest !== 'boolean') {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" streak.show_longest must be a boolean`,
      );
    }
    if (rawHabit.streak.show_current !== false) insights.push('current_streak');
    if (rawHabit.streak.show_longest === true) insights.push('longest_streak');
  }

  return {
    data_visualization: dataVisualization,
    insights: canonicalizeInsights(insights),
    streak_options: streakOptions,
  };
}

function normalizePresentation(
  rawHabit: RawHabitConfig,
  habitName: string,
  type: HabitDef['type'],
  mainOptions: readonly string[],
): Pick<HabitDef, 'data_visualization' | 'insights' | 'streak_options'> {
  if (type === 'text') {
    return {
      data_visualization: undefined,
      insights: [],
      streak_options: undefined,
    };
  }

  const hasLegacy = rawHabit.history != null || rawHabit.streak != null;
  const hasCurrent =
    rawHabit.data_visualization != null ||
    rawHabit.insights != null ||
    rawHabit.streak_options != null;
  if (hasLegacy && hasCurrent) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" cannot mix legacy history/streak keys with the new presentation keys`,
    );
  }
  if (hasLegacy) {
    return normalizeLegacyPresentation(rawHabit, habitName, type, mainOptions);
  }

  const dataVisualization = normalizeDataVisualization(rawHabit.data_visualization, habitName);
  const insights = normalizeInsights(rawHabit.insights, habitName, type);
  const hasStreakInsight = insights.some(
    (insight) => insight === 'current_streak' || insight === 'longest_streak',
  );
  const streakOptions = normalizeStreakOptions(
    rawHabit.streak_options,
    habitName,
    type,
    mainOptions,
  );
  if (hasStreakInsight && !streakOptions) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak insights require streak_options`,
    );
  }
  if (insights.includes('average') && !dataVisualization?.bargraph) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" average insight requires data_visualization.bargraph`,
    );
  }

  return {
    data_visualization: dataVisualization,
    insights,
    streak_options: streakOptions,
  };
}

export default class YAMLConfigParser implements YAMLConfigParserInterface {
  parse(content: YAMLString): ConfigData {
    if (!content.trim()) {
      throw new YAMLConfigValidationError('config cannot be empty');
    }
    let parsed: unknown;
    try {
      parsed = yaml.load(content);
    } catch {
      throw new YAMLConfigValidationError('invalid yaml');
    }
    if (parsed != null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
      throw new YAMLConfigValidationError('config must be a yaml mapping');
    }
    return this.parseConfig(parsed);
  }

  private parseConfig(parsed: unknown): ConfigData {
    if (parsed != null && !isRecord(parsed)) {
      throw new YAMLConfigValidationError('config must be a yaml mapping');
    }
    const rawConfig = (parsed ?? {}) as RawUserConfig;
    const habits = rawConfig.habits ?? {};
    if (!isRecord(habits)) {
      throw new YAMLConfigValidationError('habits must be a yaml mapping');
    }

    return {
      includeAbsentDaysInAverage: rawConfig.include_absent_days_in_average === true,
      habits: Object.entries(habits).map(([name, def]): HabitDef => {
        if (!isRecord(def)) {
          throw new YAMLConfigValidationError(`habit "${name}" must be a yaml mapping`);
        }
        const rawHabit = def as RawHabitConfig;
        const type = normalizeHabitType(rawHabit.type, name);
        const opts = type === 'single_select' ? getSingleSelectOptions(rawHabit, name) : [];
        const presentation = normalizePresentation(
          rawHabit,
          name,
          type,
          type === 'single_select'
            ? opts.map((option) => option.label)
            : rawHabit.goal != null
              ? [String(rawHabit.goal)]
              : [],
        );
        const shared = {
          name,
          repeat: normalizeRepeat(rawHabit.repeat, name),
          ...presentation,
        };
        if (type === 'single_select') {
          const theme = getHabitTheme(rawHabit.theme, name);
          return {
            ...shared,
            type,
            settings: {
              options: opts,
              ...(theme ? { theme } : {}),
            },
          };
        }
        if (type === 'text') {
          return {
            ...shared,
            type,
            settings: {
              reset: normalizeReset(rawHabit.reset, name),
            },
          };
        }
        const summationOptions = parseSummationOptionsFromRaw(
          rawHabit.summation_options ?? rawHabit.summationOptions,
        );
        return {
          ...shared,
          type,
          settings: {
            goal: rawHabit.goal ?? null,
            ...(summationOptions ? { summationOptions } : {}),
          },
        };
      }),
    };
  }
}
