import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';
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
const DB_PATH = join(DATA_DIR, 'habsum.db');
const PREVIOUS_HABIT_CONFIG_VERSIONS_TO_KEEP = 2;
const EMPTY_USER_CONFIG_TEXT = 'habits: {}\n';

mkdirSync(DATA_DIR, { recursive: true });
const configDb = new Database(DB_PATH);
configDb.pragma('journal_mode = WAL');
configDb.exec(`
  CREATE TABLE IF NOT EXISTS habit_configs (
    user TEXT NOT NULL,
    version INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user, version)
  );

  CREATE INDEX IF NOT EXISTS habit_configs_latest_idx
    ON habit_configs (user, version DESC);
`);

export type HabitType = 'summation' | 'single_select';

export type HabitDef = {
  name: string;
  type: HabitType;
  goal: number | null;
  repeat: string[];
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
  includeAbsentDaysInAverage: boolean;
  habits: HabitDef[];
};

type RawHabit = {
  type?: HabitType;
  goal?: number;
  options?: string[];
  theme?: unknown;
  repeat?: unknown;
  /** `[subtract, add]` or `{ sub, add }` / `{ add, sub }` */
  summation_options?: unknown;
  summationOptions?: unknown;
  history?: { period?: unknown; display?: unknown };
  streak?: unknown;
};

export const HABIT_REPEAT_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const HABIT_REPEAT_DAY_SET = new Set<string>(HABIT_REPEAT_DAYS);

type RawConfig = {
  include_absent_days_in_average?: unknown;
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

/** Ensures the configured data directory exists (safe to call repeatedly). */
export function ensureConfigLayout(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

type HabitConfigRow = {
  user: string;
  version: number;
  text: string;
};

const listHabitConfigUsersStmt = configDb.prepare<[], { user: string }>(`
  SELECT DISTINCT user FROM habit_configs
`);

const getLatestHabitConfigStmt = configDb.prepare<[string], HabitConfigRow>(`
  SELECT user, version, text
  FROM habit_configs
  WHERE user = ?
  ORDER BY version DESC
  LIMIT 1
`);

const getHabitConfigVersionStmt = configDb.prepare<[string, number], HabitConfigRow>(`
  SELECT user, version, text
  FROM habit_configs
  WHERE user = ? AND version = ?
`);

const getNextHabitConfigVersionStmt = configDb.prepare<[string], { version: number }>(`
  SELECT coalesce(max(version), 0) + 1 AS version
  FROM habit_configs
  WHERE user = ?
`);

const insertHabitConfigStmt = configDb.prepare<{
  user: string;
  version: number;
  text: string;
}>(`
  INSERT INTO habit_configs (user, version, text)
  VALUES (@user, @version, @text)
`);

const pruneHabitConfigVersionsStmt = configDb.prepare<{
  user: string;
  oldestVersionToKeep: number;
}>(`
  DELETE FROM habit_configs
  WHERE user = @user AND version < @oldestVersionToKeep
`);

const renameHabitConfigsStmt = configDb.prepare<{ fromUser: string; toUser: string }>(`
  UPDATE habit_configs
  SET user = @toUser
  WHERE user = @fromUser
`);

const deleteHabitConfigsStmt = configDb.prepare<[string], unknown>(`
  DELETE FROM habit_configs WHERE user = ?
`);

function getLatestStoredConfig(user: string): HabitConfigRow | null {
  return getLatestHabitConfigStmt.get(user) ?? null;
}

function usersTableExists(): boolean {
  const row = configDb
    .prepare<
      [string],
      { name: string }
    >("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get('users');
  return row != null;
}

function usersTableHasColumn(column: string): boolean {
  if (!usersTableExists()) return false;
  const cols = configDb.prepare("PRAGMA table_info('users')").all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function ensureActiveHabitConfigVersionColumn(): boolean {
  if (!usersTableExists()) return false;
  if (!usersTableHasColumn('active_habit_config_version')) {
    configDb.exec('ALTER TABLE users ADD COLUMN active_habit_config_version INTEGER');
  }
  return true;
}

function getActiveHabitConfigVersion(user: string): number | null {
  if (!ensureActiveHabitConfigVersionColumn()) return null;
  const row = configDb
    .prepare<
      [string],
      { active_habit_config_version: number | null }
    >('SELECT active_habit_config_version FROM users WHERE username = ?')
    .get(user);
  return row?.active_habit_config_version ?? null;
}

function setActiveHabitConfigVersion(user: string, version: number | null): void {
  if (!ensureActiveHabitConfigVersionColumn()) return;
  configDb
    .prepare<{
      user: string;
      version: number | null;
    }>('UPDATE users SET active_habit_config_version = @version WHERE username = @user')
    .run({ user, version });
}

function getActiveStoredConfig(user: string): HabitConfigRow | null {
  const activeVersion = getActiveHabitConfigVersion(user);
  if (activeVersion != null) {
    const active = getHabitConfigVersionStmt.get(user, activeVersion);
    if (active) return active;
  }

  const latest = getLatestStoredConfig(user);
  if (latest) setActiveHabitConfigVersion(user, latest.version);
  return latest;
}

const appendUserConfigVersion = configDb.transaction(
  (user: string, content: string): { ok: true } | { ok: false; error: string } => {
    const validation = validateUserConfigText(user, content);
    if (!validation.ok) return validation;

    const version = getNextHabitConfigVersionStmt.get(user)?.version ?? 1;
    insertHabitConfigStmt.run({ user, version, text: content });
    setActiveHabitConfigVersion(user, version);
    pruneHabitConfigVersionsStmt.run({
      user,
      oldestVersionToKeep: version - PREVIOUS_HABIT_CONFIG_VERSIONS_TO_KEEP,
    });
    return { ok: true };
  },
);

export function listUsers(): string[] {
  return listHabitConfigUsersStmt
    .all()
    .map((row) => row.user)
    .sort();
}

export function readUserConfigFileText(user: string): string | null {
  return getActiveStoredConfig(user)?.text ?? null;
}

export function writeUserConfigFileText(
  user: string,
  content: string,
): { ok: true } | { ok: false; error: string } {
  if (!getActiveStoredConfig(user)) {
    return { ok: false, error: 'config file not found' };
  }
  return appendUserConfigVersion(user, content);
}

export function validateUserConfigText(
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
    return { ok: true, config: parseUserConfig(user, parsed) };
  } catch (e) {
    if (e instanceof ConfigValidationError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'invalid config' };
  }
}

export function loadUserConfig(user: string): UserConfig | null {
  const row = getActiveStoredConfig(user);
  if (!row) return null;

  const parsed = yaml.load(row.text);
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
    includeAbsentDaysInAverage: rawConfig.include_absent_days_in_average === true,
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
        repeat: normalizeRepeat(rawHabit.repeat, name),
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

export function createEmptyUserConfig(
  user: string,
): { ok: true; user: string } | { ok: false; error: string } {
  ensureConfigLayout();

  const existing = getActiveStoredConfig(user);
  if (existing) {
    return { ok: false, error: `user "${user}" already exists` };
  }

  const out = appendUserConfigVersion(user, EMPTY_USER_CONFIG_TEXT);
  if (!out.ok) return out;

  return { ok: true, user };
}

export function renameUserConfigFile(
  fromUser: string,
  toUser: string,
): { ok: true; user: string } | { ok: false; error: string } {
  if (!getActiveStoredConfig(fromUser)) return { ok: false, error: 'user not found' };

  const existingTarget = getActiveStoredConfig(toUser);
  if (existingTarget) {
    return { ok: false, error: `user "${toUser}" already exists` };
  }

  renameHabitConfigsStmt.run({ fromUser, toUser });

  return { ok: true, user: toUser };
}

export function deleteUserConfigFile(
  user: string,
): { ok: true; user: string } | { ok: false; error: string } {
  if (!getActiveStoredConfig(user)) return { ok: false, error: 'user not found' };
  deleteHabitConfigsStmt.run(user);
  setActiveHabitConfigVersion(user, null);
  return { ok: true, user };
}
