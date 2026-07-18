// Parses persisted YAML habit config text into the server UserConfig model.
import { parseSummationOptionsFromRaw } from '@habsum/types/common/habit';
import {
  DEFAULT_STREAK_FREQUENCY,
  formatStreakFrequency,
  parseStreakFrequencyDays,
} from '@habsum/types/common/streak';
import yaml from 'js-yaml';
import {
  HABIT_REPEAT_DAYS,
  type HabitDef,
  type RawHabitConfig,
  type RawUserConfig,
  type UserConfig,
} from '../types/userConfig.js';

class YAMLConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YAMLConfigValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

const HABIT_REPEAT_DAY_SET = new Set<string>(HABIT_REPEAT_DAYS);

function normalizeRepeat(raw: unknown, habitName: string): HabitDef['repeat'] {
  if (raw == null) return [...HABIT_REPEAT_DAYS];
  if (!Array.isArray(raw)) {
    throw new YAMLConfigValidationError(`habit "${habitName}" repeat must be a yaml list`);
  }

  const days: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !HABIT_REPEAT_DAY_SET.has(item)) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" repeat must only include monday, tuesday, wednesday, thursday, friday, saturday, sunday`,
      );
    }
    if (!days.includes(item)) days.push(item);
  }
  if (days.length === 0) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" repeat must include at least one day`,
    );
  }
  return days;
}

function normalizeHistory(
  raw: RawHabitConfig['history'],
  habitName: string,
): HabitDef['history'] | undefined {
  if (!raw) return undefined;

  if (!isRecord(raw)) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" history must be a yaml mapping with period`,
    );
  }

  const { period } = raw;
  if (typeof period !== 'string' || period.length === 0) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" history.period must be a non-empty string`,
    );
  }
  const displays = normalizeHistoryDisplays(raw.displays, raw.display, habitName);
  return { period, displays };
}

function normalizeHistoryDisplays(
  rawDisplays: unknown,
  rawDisplay: unknown,
  habitName: string,
): NonNullable<HabitDef['history']>['displays'] {
  const rawValues =
    rawDisplays == null ? (rawDisplay == null ? ['weekly_history'] : [rawDisplay]) : rawDisplays;
  if (!Array.isArray(rawValues)) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" history.displays must be a yaml list`,
    );
  }
  const displays: NonNullable<HabitDef['history']>['displays'] = [];
  for (const item of rawValues) {
    if (item !== 'heatmap' && item !== 'weekly_history') {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" history.displays must only include "heatmap" or "weekly_history"`,
      );
    }
    if (!displays.includes(item)) displays.push(item);
  }
  if (displays.length > 0) return displays;
  throw new YAMLConfigValidationError(
    `habit "${habitName}" history.displays must include at least one display`,
  );
}

function normalizeStreak(
  raw: unknown,
  habitName: string,
  mainOptions: readonly string[],
  optionsRequired = true,
  useMainOptionsOnly = false,
): HabitDef['streak'] | undefined {
  if (raw == null) return undefined;

  if (!isRecord(raw)) {
    throw new YAMLConfigValidationError(`habit "${habitName}" streak must be a yaml mapping`);
  }

  const optsRaw = raw.options;
  if ((!Array.isArray(optsRaw) || optsRaw.length === 0) && optionsRequired) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak.options must be a non-empty array`,
    );
  }

  if (mainOptions.length === 0) {
    throw new YAMLConfigValidationError(`habit "${habitName}" streak requires a configured goal`);
  }

  const rawOptions =
    useMainOptionsOnly || !Array.isArray(optsRaw) || optsRaw.length === 0 ? mainOptions : optsRaw;
  const allowed = new Set(mainOptions);
  const options: string[] = [];
  const seen = new Set<string>();
  for (const item of rawOptions) {
    const normalized = typeof item === 'number' && Number.isFinite(item) ? String(item) : item;
    if (typeof normalized !== 'string' || normalized.length === 0) {
      throw new YAMLConfigValidationError(`habit "${habitName}" streak.options must be strings`);
    }
    if (!allowed.has(normalized)) {
      throw new YAMLConfigValidationError(
        `habit "${habitName}" streak.options entry "${normalized}" is not listed in habits options`,
      );
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    options.push(normalized);
  }

  if (options.length === 0) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak.options must list at least one habits option`,
    );
  }

  const frequency = normalizeStreakFrequency(raw.frequency, habitName);
  const show_longest = normalizeStreakShowLongest(raw.show_longest, habitName);

  return {
    options,
    ...(frequency !== DEFAULT_STREAK_FREQUENCY ? { frequency } : {}),
    ...(show_longest ? { show_longest: true } : {}),
  };
}

function normalizeStreakShowLongest(raw: unknown, habitName: string): boolean {
  if (raw == null) return false;
  if (typeof raw === 'boolean') return raw;
  throw new YAMLConfigValidationError(`habit "${habitName}" streak.show_longest must be a boolean`);
}

function normalizeStreakFrequency(raw: unknown, habitName: string): string {
  if (raw == null) return DEFAULT_STREAK_FREQUENCY;

  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak.frequency must be a string like "3d/1w"`,
    );
  }

  const spec = raw.trim();
  if (!/^\d+d\/1w$/.test(spec)) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak.frequency must match Nd/1w (e.g. "3d/1w")`,
    );
  }

  const days = parseStreakFrequencyDays(spec);
  if (days < 1 || days > 7) {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak.frequency day count must be between 1 and 7`,
    );
  }

  try {
    return formatStreakFrequency(days);
  } catch {
    throw new YAMLConfigValidationError(
      `habit "${habitName}" streak.frequency day count must be between 1 and 7`,
    );
  }
}

export class YAMLConfigParser {
  static readonly ConfigValidationError = YAMLConfigValidationError;

  constructor(private readonly user: string) {}

  parse(content: string): UserConfig {
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
    return this.parseUserConfig(parsed);
  }

  private parseUserConfig(parsed: unknown): UserConfig {
    if (parsed != null && !isRecord(parsed)) {
      throw new YAMLConfigValidationError('config must be a yaml mapping');
    }
    const rawConfig = (parsed ?? {}) as RawUserConfig;
    const habits = rawConfig.habits ?? {};
    if (!isRecord(habits)) {
      throw new YAMLConfigValidationError('habits must be a yaml mapping');
    }

    return {
      user: this.user,
      includeAbsentDaysInAverage: rawConfig.include_absent_days_in_average === true,
      habits: Object.entries(habits).map(([name, def]) => {
        if (!isRecord(def)) {
          throw new YAMLConfigValidationError(`habit "${name}" must be a yaml mapping`);
        }
        const rawHabit = def as RawHabitConfig;
        const type = rawHabit.type ?? 'summation';
        const opts =
          type === 'single_select' && Array.isArray(rawHabit.options)
            ? rawHabit.options.filter((x) => typeof x === 'string')
            : undefined;
        return {
          name,
          type,
          goal: rawHabit.goal ?? null,
          repeat: normalizeRepeat(rawHabit.repeat, name),
          options: opts,
          theme:
            type === 'single_select' && typeof rawHabit.theme === 'string'
              ? rawHabit.theme
              : undefined,
          summationOptions:
            type === 'summation'
              ? parseSummationOptionsFromRaw(
                  rawHabit.summation_options ?? rawHabit.summationOptions,
                )
              : undefined,
          history: normalizeHistory(rawHabit.history, name),
          streak:
            type === 'single_select'
              ? normalizeStreak(rawHabit.streak, name, opts ?? [])
              : normalizeStreak(
                  rawHabit.streak,
                  name,
                  rawHabit.goal != null ? [String(rawHabit.goal)] : [],
                  false,
                  true,
                ),
        };
      }),
    };
  }
}
