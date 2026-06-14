import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  unlinkSync,
  mkdirSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSummationOptionsFromRaw, type SummationOptions } from '@habsum/types/common/habit';
import {
  DEFAULT_STREAK_FREQUENCY,
  formatStreakFrequency,
  parseStreakFrequencyDays,
} from '@habsum/types/common/streak';
import yaml from 'js-yaml';

const rawDir = process.env.HABSUM_CONFIG_DIR;
if (!rawDir) {
  throw new Error('[habsum] HABSUM_CONFIG_DIR is required (must point to your data directory)');
}

const DATA_DIR = resolve(rawDir);
const USERS_DIR = join(DATA_DIR, 'users');
const SAMPLE_CONFIG_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'utils',
  'sample-config.yaml',
);

export type HabitType = 'summation' | 'single_select';

export type HabitDef = {
  name: string;
  type: HabitType;
  goal: number | null;
  options?: string[];
  theme?: string;
  /** Fixed +/− steps from YAML `summation_options` (array) or legacy `{ sub, add }`. */
  summationOptions?: SummationOptions;
  history?: {
    period: string;
  };
  /** Subset of selectable values or summation totals that count toward the streak. */
  streak?: {
    options: string[];
    /** Target streak days per week, e.g. `3d/1w`. Omitted when daily (`7d/1w`). */
    frequency?: string;
    /** When true, API includes `longestStreak` on streak responses. */
    show_longest?: boolean;
  };
};

export type UserConfig = {
  user: string;
  habits: HabitDef[];
};

type RawHabit = {
  type?: HabitType;
  goal?: number;
  options?: string[];
  theme?: unknown;
  /** `[subtract, add]` or `{ sub, add }` / `{ add, sub }` */
  summation_options?: unknown;
  summationOptions?: unknown;
  history?: { period?: unknown; display?: unknown };
  streak?: unknown;
};

type RawConfig = {
  habits?: Record<string, RawHabit>;
};

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** Creates `<HABSUM_CONFIG_DIR>/users/` when missing (safe to call repeatedly). */
export function ensureConfigLayout(): void {
  mkdirSync(USERS_DIR, { recursive: true });
}

export function listUsers(): string[] {
  if (!existsSync(USERS_DIR)) {
    throw new Error(
      `[habsum] missing users directory: ${USERS_DIR}\n` +
        'Expected user config files at <HABSUM_CONFIG_DIR>/users/<user>.yaml',
    );
  }
  return readdirSync(USERS_DIR)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map((f) => f.replace(/\.ya?ml$/, ''))
    .sort();
}

/** Resolved path to the user's YAML on disk, or null if the file is missing. */
export function getUserConfigFilePath(user: string): string | null {
  const candidates = [join(USERS_DIR, `${user}.yaml`), join(USERS_DIR, `${user}.yml`)];
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function readUserConfigFileText(user: string): string | null {
  const path = getUserConfigFilePath(user);
  if (!path) return null;
  return readFileSync(path, 'utf8');
}

export function writeUserConfigFileText(
  user: string,
  content: string,
): { ok: true } | { ok: false; error: string } {
  const path = getUserConfigFilePath(user);
  if (!path) {
    return { ok: false, error: 'config file not found' };
  }
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
    parseUserConfig(user, parsed);
  } catch (e) {
    if (e instanceof ConfigValidationError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'invalid config' };
  }
  try {
    writeFileSync(path, content, 'utf8');
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'write failed' };
  }
  return { ok: true };
}

export function loadUserConfig(user: string): UserConfig | null {
  const path = getUserConfigFilePath(user);
  if (!path) return null;

  const raw = readFileSync(path, 'utf8');
  const parsed = yaml.load(raw);

  return parseUserConfig(user, parsed);
}

function parseUserConfig(user: string, parsed: unknown): UserConfig {
  if (parsed != null && !isRecord(parsed)) {
    throw new ConfigValidationError('config must be a yaml mapping');
  }
  const rawConfig = (parsed ?? {}) as RawConfig;
  const habits = rawConfig.habits ?? {};
  if (!isRecord(habits)) {
    throw new ConfigValidationError('habits must be a yaml mapping');
  }

  return {
    user,
    habits: Object.entries(habits).map(([name, def]) => {
      if (!isRecord(def)) {
        throw new ConfigValidationError(`habit "${name}" must be a yaml mapping`);
      }
      const rawHabit = def as RawHabit;
      const type = rawHabit.type ?? 'summation';
      const opts =
        type === 'single_select' && Array.isArray(rawHabit.options)
          ? rawHabit.options.filter((x) => typeof x === 'string')
          : undefined;
      return {
        name,
        type,
        goal: rawHabit.goal ?? null,
        options: opts,
        theme:
          type === 'single_select' && typeof rawHabit.theme === 'string'
            ? rawHabit.theme
            : undefined,
        summationOptions:
          type === 'summation'
            ? parseSummationOptionsFromRaw(rawHabit.summation_options ?? rawHabit.summationOptions)
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

function normalizeHistory(
  raw: RawHabit['history'],
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
  return { period };
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

export function createUserFromSampleConfig(
  user: string,
): { ok: true; user: string } | { ok: false; error: string } {
  ensureConfigLayout();

  const existing = getUserConfigFilePath(user);
  if (existing) {
    return { ok: false, error: `user "${user}" already exists` };
  }

  let sample: string;
  try {
    sample = readFileSync(SAMPLE_CONFIG_PATH, 'utf8');
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'failed to read sample config',
    };
  }

  if (!sample.trim()) {
    return { ok: false, error: 'sample config is empty' };
  }

  const target = join(USERS_DIR, `${user}.yaml`);
  try {
    writeFileSync(target, sample, 'utf8');
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'write failed',
    };
  }

  return { ok: true, user };
}

export function renameUserConfigFile(
  fromUser: string,
  toUser: string,
): { ok: true; user: string } | { ok: false; error: string } {
  const fromPath = getUserConfigFilePath(fromUser);
  if (!fromPath) return { ok: false, error: 'user not found' };

  const existingTarget = getUserConfigFilePath(toUser);
  if (existingTarget) {
    return { ok: false, error: `user "${toUser}" already exists` };
  }

  const toPath = join(USERS_DIR, `${toUser}.yaml`);
  try {
    renameSync(fromPath, toPath);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'rename failed',
    };
  }

  return { ok: true, user: toUser };
}

export function deleteUserConfigFile(
  user: string,
): { ok: true; user: string } | { ok: false; error: string } {
  const path = getUserConfigFilePath(user);
  if (!path) return { ok: false, error: 'user not found' };
  try {
    unlinkSync(path);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'delete failed',
    };
  }
  return { ok: true, user };
}
