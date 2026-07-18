// Service layer for validating, parsing, and managing persisted YAML user habit configs.
import { parseSummationOptionsFromRaw } from '@habsum/types/common/habit';
import {
  DEFAULT_STREAK_FREQUENCY,
  formatStreakFrequency,
  parseStreakFrequencyDays,
} from '@habsum/types/common/streak';
import yaml from 'js-yaml';
import { YamlUserConfigResource } from '../repositories/yaml-user-config-resource.js';
import {
  HABIT_REPEAT_DAYS,
  type HabitDef,
  type RawHabitConfig,
  type RawUserConfig,
  type UserConfig,
} from '../types/userConfig.js';

const EMPTY_USER_CONFIG_TEXT = 'habits: {}\n';
const HABIT_REPEAT_DAY_SET = new Set<string>(HABIT_REPEAT_DAYS);

class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export class YamlUserConfigService {
  static readonly ConfigValidationError = ConfigValidationError;

  constructor(private readonly resource = new YamlUserConfigResource()) {}

  ensureConfigLayout(): void {
    this.resource.ensureLayout();
  }

  listUsers(): string[] {
    return this.resource.listUsers();
  }

  readUserConfigFileText(user: string): string | null {
    return this.resource.readActiveConfigText(user);
  }

  writeUserConfigFileText(
    user: string,
    content: string,
  ): { ok: true } | { ok: false; error: string } {
    if (!this.resource.hasUserConfig(user)) {
      return { ok: false, error: 'config file not found' };
    }
    const validation = this.validateUserConfigText(user, content);
    if (!validation.ok) return validation;
    this.resource.appendUserConfigVersion(user, content);
    return { ok: true };
  }

  validateUserConfigText(
    user: string,
    content: string,
  ): { ok: true; config: UserConfig } | { ok: false; error: string } {
    if (!content.trim()) {
      return { ok: false, error: 'config cannot be empty' };
    }
    let parsed: unknown;
    try {
      parsed = yaml.load(content);
    } catch {
      return { ok: false, error: 'invalid yaml' };
    }
    if (parsed != null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
      return { ok: false, error: 'config must be a yaml mapping' };
    }
    try {
      return { ok: true, config: this.parseUserConfig(user, parsed) };
    } catch (e) {
      if (e instanceof ConfigValidationError) {
        return { ok: false, error: e.message };
      }
      return { ok: false, error: e instanceof Error ? e.message : 'invalid config' };
    }
  }

  loadUserConfig(user: string): UserConfig | null {
    const text = this.resource.readActiveConfigText(user);
    if (text == null) return null;

    const parsed = yaml.load(text);
    return this.parseUserConfig(user, parsed);
  }

  createEmptyUserConfig(user: string): { ok: true; user: string } | { ok: false; error: string } {
    this.ensureConfigLayout();

    if (this.resource.hasUserConfig(user)) {
      return { ok: false, error: `user "${user}" already exists` };
    }

    const validation = this.validateUserConfigText(user, EMPTY_USER_CONFIG_TEXT);
    if (!validation.ok) return validation;
    this.resource.appendUserConfigVersion(user, EMPTY_USER_CONFIG_TEXT);

    return { ok: true, user };
  }

  renameUserConfigFile(
    fromUser: string,
    toUser: string,
  ): { ok: true; user: string } | { ok: false; error: string } {
    if (!this.resource.hasUserConfig(fromUser)) return { ok: false, error: 'user not found' };

    if (this.resource.hasUserConfig(toUser)) {
      return { ok: false, error: `user "${toUser}" already exists` };
    }

    this.resource.renameUserConfig(fromUser, toUser);

    return { ok: true, user: toUser };
  }

  deleteUserConfigFile(user: string): { ok: true; user: string } | { ok: false; error: string } {
    if (!this.resource.hasUserConfig(user)) return { ok: false, error: 'user not found' };
    this.resource.deleteUserConfig(user);
    return { ok: true, user };
  }

  private parseUserConfig(user: string, parsed: unknown): UserConfig {
    if (parsed != null && !isRecord(parsed)) {
      throw new ConfigValidationError('config must be a yaml mapping');
    }
    const rawConfig = (parsed ?? {}) as RawUserConfig;
    const habits = rawConfig.habits ?? {};
    if (!isRecord(habits)) {
      throw new ConfigValidationError('habits must be a yaml mapping');
    }

    return {
      user,
      includeAbsentDaysInAverage: rawConfig.include_absent_days_in_average === true,
      habits: Object.entries(habits).map(([name, def]) => {
        if (!isRecord(def)) {
          throw new ConfigValidationError(`habit "${name}" must be a yaml mapping`);
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

function normalizeRepeat(raw: unknown, habitName: string): HabitDef['repeat'] {
  if (raw == null) return [...HABIT_REPEAT_DAYS];
  if (!Array.isArray(raw)) {
    throw new ConfigValidationError(`habit "${habitName}" repeat must be a yaml list`);
  }

  const days: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !HABIT_REPEAT_DAY_SET.has(item)) {
      throw new ConfigValidationError(
        `habit "${habitName}" repeat must only include monday, tuesday, wednesday, thursday, friday, saturday, sunday`,
      );
    }
    if (!days.includes(item)) days.push(item);
  }
  if (days.length === 0) {
    throw new ConfigValidationError(`habit "${habitName}" repeat must include at least one day`);
  }
  return days;
}

function normalizeHistory(
  raw: RawHabitConfig['history'],
  habitName: string,
): HabitDef['history'] | undefined {
  if (!raw) return undefined;

  if (!isRecord(raw)) {
    throw new ConfigValidationError(
      `habit "${habitName}" history must be a yaml mapping with period`,
    );
  }

  const { period } = raw;
  if (typeof period !== 'string' || period.length === 0) {
    throw new ConfigValidationError(
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
    throw new ConfigValidationError(`habit "${habitName}" history.displays must be a yaml list`);
  }
  const displays: NonNullable<HabitDef['history']>['displays'] = [];
  for (const item of rawValues) {
    if (item !== 'heatmap' && item !== 'weekly_history') {
      throw new ConfigValidationError(
        `habit "${habitName}" history.displays must only include "heatmap" or "weekly_history"`,
      );
    }
    if (!displays.includes(item)) displays.push(item);
  }
  if (displays.length > 0) return displays;
  throw new ConfigValidationError(
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
    throw new ConfigValidationError(`habit "${habitName}" streak must be a yaml mapping`);
  }

  const optsRaw = raw.options;
  if ((!Array.isArray(optsRaw) || optsRaw.length === 0) && optionsRequired) {
    throw new ConfigValidationError(
      `habit "${habitName}" streak.options must be a non-empty array`,
    );
  }

  if (mainOptions.length === 0) {
    throw new ConfigValidationError(`habit "${habitName}" streak requires a configured goal`);
  }

  const rawOptions =
    useMainOptionsOnly || !Array.isArray(optsRaw) || optsRaw.length === 0 ? mainOptions : optsRaw;
  const allowed = new Set(mainOptions);
  const options: string[] = [];
  const seen = new Set<string>();
  for (const item of rawOptions) {
    const normalized = typeof item === 'number' && Number.isFinite(item) ? String(item) : item;
    if (typeof normalized !== 'string' || normalized.length === 0) {
      throw new ConfigValidationError(`habit "${habitName}" streak.options must be strings`);
    }
    if (!allowed.has(normalized)) {
      throw new ConfigValidationError(
        `habit "${habitName}" streak.options entry "${normalized}" is not listed in habits options`,
      );
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    options.push(normalized);
  }

  if (options.length === 0) {
    throw new ConfigValidationError(
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
  throw new ConfigValidationError(`habit "${habitName}" streak.show_longest must be a boolean`);
}

function normalizeStreakFrequency(raw: unknown, habitName: string): string {
  if (raw == null) return DEFAULT_STREAK_FREQUENCY;

  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new ConfigValidationError(
      `habit "${habitName}" streak.frequency must be a string like "3d/1w"`,
    );
  }

  const spec = raw.trim();
  if (!/^\d+d\/1w$/.test(spec)) {
    throw new ConfigValidationError(
      `habit "${habitName}" streak.frequency must match Nd/1w (e.g. "3d/1w")`,
    );
  }

  const days = parseStreakFrequencyDays(spec);
  if (days < 1 || days > 7) {
    throw new ConfigValidationError(
      `habit "${habitName}" streak.frequency day count must be between 1 and 7`,
    );
  }

  try {
    return formatStreakFrequency(days);
  } catch {
    throw new ConfigValidationError(
      `habit "${habitName}" streak.frequency day count must be between 1 and 7`,
    );
  }
}
