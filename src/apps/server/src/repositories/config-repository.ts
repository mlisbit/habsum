// Repository that owns persisted YAML user config versions in SQLite.
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Database from 'better-sqlite3';

const rawDir = process.env.HABSUM_CONFIG_DIR;
if (!rawDir) {
  throw new Error('[habsum] HABSUM_CONFIG_DIR is required (must point to your data directory)');
}

const DATA_DIR = resolve(rawDir);
const DB_PATH = join(DATA_DIR, 'habsum.db');
const PREVIOUS_HABIT_CONFIG_VERSIONS_TO_KEEP = 2;

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

const writeUserConfigTextTransaction = configDb.transaction(
  (user: string, content: string): void => {
    const version = getNextHabitConfigVersionStmt.get(user)?.version ?? 1;
    insertHabitConfigStmt.run({ user, version, text: content });
    setActiveHabitConfigVersion(user, version);
    pruneHabitConfigVersionsStmt.run({
      user,
      oldestVersionToKeep: version - PREVIOUS_HABIT_CONFIG_VERSIONS_TO_KEEP,
    });
  },
);

export class ConfigRepository {
  ensureLayout(): void {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  listUsers(): string[] {
    return listHabitConfigUsersStmt
      .all()
      .map((row) => row.user)
      .sort();
  }

  readUserConfigText(user: string): string | null {
    return getActiveStoredConfig(user)?.text ?? null;
  }

  hasUserConfig(user: string): boolean {
    return getActiveStoredConfig(user) != null;
  }

  writeUserConfigText(user: string, content: string): void {
    writeUserConfigTextTransaction(user, content);
  }

  renameUserConfig(fromUser: string, toUser: string): void {
    renameHabitConfigsStmt.run({ fromUser, toUser });
  }

  deleteUserConfig(user: string): void {
    deleteHabitConfigsStmt.run(user);
    setActiveHabitConfigVersion(user, null);
  }
}
