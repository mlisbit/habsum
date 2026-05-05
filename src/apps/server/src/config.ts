import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SummationOptions } from '@habsum/api-types';
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
  /** Fixed +/− steps from YAML: `[sub, add]`, `[sub, input, add]`, or `{ add, sub }`. */
  summationOptions?: SummationOptions;
  history?: {
    period: string;
    display: 'average';
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
  /** `[subtract, add]` or `{ sub, add }` / `{ add, sub }` */
  summation_options?: unknown;
  summationOptions?: unknown;
  history?: { period?: unknown; display?: unknown };
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
      return {
        name,
        type,
        goal: rawHabit.goal ?? null,
        options:
          type === 'single_select' && Array.isArray(rawHabit.options)
            ? rawHabit.options.filter((x) => typeof x === 'string')
            : undefined,
        summationOptions: type === 'summation' ? parseSummationOptions(rawHabit) : undefined,
        history: normalizeHistory(rawHabit.history, name),
      };
    }),
  };
}

function parseSummationOptions(def: RawHabit): SummationOptions | undefined {
  const raw = def.summation_options ?? def.summationOptions;
  if (raw == null) return undefined;

  // summation_options: [sub, add] — first value subtracts, second adds
  // summation_options: [sub, input, add] — same steps; middle marks editable + amount (defaults to add)
  if (Array.isArray(raw)) {
    if (raw.length === 2) {
      const subN = Math.trunc(Number(raw[0]));
      const addN = Math.trunc(Number(raw[1]));
      if (!Number.isFinite(subN) || !Number.isFinite(addN)) return undefined;
      if (subN < 1 || addN < 1) return undefined;
      return { add: addN, sub: subN };
    }
    if (raw.length === 3) {
      const subN = Math.trunc(Number(raw[0]));
      const mid = raw[1];
      const addN = Math.trunc(Number(raw[2]));
      const midLabel = typeof mid === 'string' ? mid.trim().toLowerCase() : '';
      if (midLabel !== 'input') return undefined;
      if (!Number.isFinite(subN) || !Number.isFinite(addN)) return undefined;
      if (subN < 1 || addN < 1) return undefined;
      return { add: addN, sub: subN, inputBetween: true };
    }
    return undefined;
  }

  if (typeof raw !== 'object') return undefined;
  const rec = raw as Record<string, unknown>;
  const add = Number(rec.add);
  const sub = Number(rec.sub);
  if (!Number.isFinite(add) || !Number.isFinite(sub)) return undefined;
  const addN = Math.trunc(add);
  const subN = Math.trunc(sub);
  if (addN < 1 || subN < 1) return undefined;
  const inputBetween =
    rec.inputBetween === true ||
    rec.input_between === true ||
    rec.inputBetween === 'true' ||
    rec.input_between === 'true';
  return inputBetween ? { add: addN, sub: subN, inputBetween: true } : { add: addN, sub: subN };
}

function normalizeHistory(
  raw: RawHabit['history'],
  habitName: string,
): HabitDef['history'] | undefined {
  if (!raw) return undefined;

  if (!isRecord(raw)) {
    throw new ConfigValidationError(
      `habit "${habitName}" history must be a yaml mapping with period and display`,
    );
  }

  const { period, display } = raw;
  if (typeof period !== 'string' || period.length === 0) {
    throw new ConfigValidationError(
      `habit "${habitName}" history.period must be a non-empty string`,
    );
  }
  if (display !== 'average') {
    throw new ConfigValidationError(`habit "${habitName}" history.display must be "average"`);
  }
  return { period, display: 'average' };
}

export function createUserFromSampleConfig(
  user: string,
): { ok: true; user: string } | { ok: false; error: string } {
  if (!existsSync(USERS_DIR)) {
    return {
      ok: false,
      error:
        `missing users directory: ${USERS_DIR}\n` + 'Expected <HABSUM_CONFIG_DIR>/users/ to exist',
    };
  }

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
