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
  history?:
    | { period?: string; display?: 'average' }
    | Array<{ period?: string } | { display?: 'average' }>;
};

type RawConfig = {
  habits?: Record<string, RawHabit>;
};

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
  const parsed = (yaml.load(raw) as RawConfig | null) ?? {};
  const habits = parsed.habits ?? {};

  return {
    user,
    habits: Object.entries(habits).map(([name, def]) => ({
      name,
      type: def?.type ?? 'summation',
      goal: def?.goal ?? null,
      options:
        def?.type === 'single_select' && Array.isArray(def?.options)
          ? def.options.filter((x) => typeof x === 'string')
          : undefined,
      history: normalizeHistory(def?.history),
    })),
  };
}

function normalizeHistory(raw: RawHabit['history']): HabitDef['history'] | undefined {
  if (!raw) return undefined;

  // Support either:
  // history: { period: 1w, display: average }
  // OR the YAML list style the repo currently uses:
  // history:
  //   - period: 1w
  //   - display: average
  const period = Array.isArray(raw)
    ? (raw.find((x) => typeof (x as any)?.period === 'string') as { period?: string } | undefined)
        ?.period
    : raw.period;
  const display = Array.isArray(raw)
    ? (
        raw.find((x) => typeof (x as any)?.display === 'string') as
          | { display?: 'average' }
          | undefined
      )?.display
    : raw.display;

  if (typeof period !== 'string' || period.length === 0) return undefined;
  if (display !== 'average') return undefined;
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
