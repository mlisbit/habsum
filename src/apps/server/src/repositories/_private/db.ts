// Central SQLite access layer for persisted user, auth, and habit data.
import Database from 'better-sqlite3';
import { hashPassword, isPasswordHashed, verifyPassword } from '@habsum/utils/password';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { PASSWORD_RESET_COOLDOWN_SECONDS } from '../../constants.js';
import getDatabasePath from '../../utils/get-database-path.js';
import { isAllowedUiTheme, isPlausibleEmail } from '../../utils/request-utils.js';
import migrateApplicationSettings from '../../utils/migrate-application-settings.js';

const DB_PATH = getDatabasePath();
const DATA_DIR = dirname(DB_PATH);
try {
  mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  throw new Error(
    `[habsum] could not create data directory: ${DATA_DIR}\n` +
      (e instanceof Error ? e.message : 'unknown error'),
  );
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    pin TEXT NOT NULL,
    admin INTEGER NOT NULL DEFAULT 0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS application_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    account_signup INTEGER NOT NULL DEFAULT 0,
    email_provider TEXT,
    email_api_key TEXT,
    email_from_email TEXT,
    email_updated_at INTEGER,
    demo_username TEXT NOT NULL DEFAULT '',
    demo_password TEXT NOT NULL DEFAULT ''
  );
`);

migrateApplicationSettings(db);

const userColumns = db.prepare("PRAGMA table_info('users')").all() as Array<{
  name: string;
  type: string;
}>;
if (!userColumns.some((column) => column.name === 'admin')) {
  db.exec('ALTER TABLE users ADD COLUMN admin INTEGER NOT NULL DEFAULT 0');
}
if (userColumns.some((column) => column.name === 'pin' && column.type.toUpperCase() !== 'TEXT')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_next (
      username TEXT PRIMARY KEY,
      pin TEXT NOT NULL,
      admin INTEGER NOT NULL DEFAULT 0
    );

    INSERT INTO users_next (username, pin, admin)
    SELECT username, CAST(pin AS TEXT), admin
    FROM users;

    DROP TABLE users;
    ALTER TABLE users_next RENAME TO users;
  `);
}
function usersTableHasColumn(column: string): boolean {
  const cols = db.prepare("PRAGMA table_info('users')").all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}
if (!usersTableHasColumn('display_name')) {
  db.exec('ALTER TABLE users ADD COLUMN display_name TEXT');
}
if (!usersTableHasColumn('theme')) {
  db.exec('ALTER TABLE users ADD COLUMN theme TEXT');
}
if (!usersTableHasColumn('email')) {
  db.exec('ALTER TABLE users ADD COLUMN email TEXT');
}
if (!usersTableHasColumn('created_at')) {
  db.exec('ALTER TABLE users ADD COLUMN created_at TEXT');
}
if (!usersTableHasColumn('beta_tester')) {
  db.exec('ALTER TABLE users ADD COLUMN beta_tester INTEGER NOT NULL DEFAULT 1');
}
if (!usersTableHasColumn('demo_user')) {
  db.exec('ALTER TABLE users ADD COLUMN demo_user INTEGER NOT NULL DEFAULT 0');
}
if (!usersTableHasColumn('force_password_reset')) {
  db.exec('ALTER TABLE users ADD COLUMN force_password_reset INTEGER NOT NULL DEFAULT 0');
}
if (!usersTableHasColumn('last_login_at')) {
  db.exec('ALTER TABLE users ADD COLUMN last_login_at INTEGER');
}
if (!usersTableHasColumn('web_and_api_version')) {
  db.exec('ALTER TABLE users ADD COLUMN web_and_api_version TEXT');
}
if (!usersTableHasColumn('active_habit_config_version')) {
  db.exec('ALTER TABLE users ADD COLUMN active_habit_config_version INTEGER');
}

db.exec(`
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

function usersThemeColumnIsNotNull(): boolean {
  const cols = db.prepare("PRAGMA table_info('users')").all() as Array<{
    name: string;
    notnull: number;
  }>;
  return cols.find((c) => c.name === 'theme')?.notnull === 1;
}

/** SQLite builds here cannot `ALTER COLUMN … DROP NOT NULL`; rebuild when `theme` was NOT NULL. */
function migrateUsersThemeToNullable(): void {
  if (!usersTableHasColumn('theme') || !usersThemeColumnIsNotNull()) return;
  db.exec(`
    CREATE TABLE users_theme_nullable (
      username TEXT PRIMARY KEY,
      pin TEXT NOT NULL,
      admin INTEGER NOT NULL DEFAULT 0,
      display_name TEXT,
      theme TEXT,
      email TEXT,
      created_at TEXT,
      beta_tester INTEGER NOT NULL DEFAULT 1,
      demo_user INTEGER NOT NULL DEFAULT 0,
      force_password_reset INTEGER NOT NULL DEFAULT 0,
      last_login_at INTEGER,
      web_and_api_version TEXT,
      active_habit_config_version INTEGER
    );

    INSERT INTO users_theme_nullable (
      username, pin, admin, display_name, theme, email, created_at, beta_tester, demo_user,
      force_password_reset, last_login_at, web_and_api_version, active_habit_config_version
    )
    SELECT
      username, pin, admin, display_name, theme, email, created_at,
      COALESCE(beta_tester, 1), COALESCE(demo_user, 0), COALESCE(force_password_reset, 0), last_login_at,
      web_and_api_version, active_habit_config_version
    FROM users;

    DROP TABLE users;
    ALTER TABLE users_theme_nullable RENAME TO users;
  `);
}

migrateUsersThemeToNullable();

const migratePlainTextPasswordStmt = db.prepare<{
  username: string;
  passwordHash: string;
}>(`
  UPDATE users SET pin = @passwordHash WHERE username = @username
`);

/** Re-hash passwords left in plain text by versions that predate password hashing. */
function migratePlainTextPasswords(): void {
  const rows = db.prepare('SELECT username, pin AS passwordHash FROM users').all() as Array<{
    username: string;
    passwordHash: string;
  }>;
  for (const row of rows) {
    if (!isPasswordHashed(row.passwordHash)) {
      migratePlainTextPasswordStmt.run({
        username: row.username,
        passwordHash: hashPassword(row.passwordHash),
      });
    }
  }
}

migratePlainTextPasswords();

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (email)
  WHERE email IS NOT NULL AND trim(email) != '';
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS habit_summation_events (
    id INTEGER PRIMARY KEY,
    user TEXT NOT NULL,
    habit TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS habit_summation_events_day_idx
    ON habit_summation_events (user, habit, date, id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS habit_daily_selects (
    user  TEXT NOT NULL,
    habit TEXT NOT NULL,
    date  TEXT NOT NULL, -- YYYY-MM-DD
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user, habit, date)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS habit_text (
    user  TEXT NOT NULL,
    habit TEXT NOT NULL,
    date  TEXT NOT NULL, -- YYYY-MM-DD
    text  TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user, habit, date)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS sessions_username_idx ON sessions (username);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_requests (
    username TEXT PRIMARY KEY,
    requested_at INTEGER NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'reset'
  );

  CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
    ON password_reset_tokens (user_id);

  CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_hash_unique
    ON password_reset_tokens (token_hash);
`);

function passwordResetTokensTableHasColumn(column: string): boolean {
  const cols = db.prepare("PRAGMA table_info('password_reset_tokens')").all() as Array<{
    name: string;
  }>;
  return cols.some((c) => c.name === column);
}
if (!passwordResetTokensTableHasColumn('purpose')) {
  db.exec(`ALTER TABLE password_reset_tokens ADD COLUMN purpose TEXT NOT NULL DEFAULT 'reset'`);
}

export type SummationEventRow = {
  id: number;
  date: string;
  amount: number;
  createdAt: string;
};
export type DailySelectExportRow = {
  habit: string;
  date: string;
  value: string;
  updatedAt: string;
};
export type HabitTextExportRow = {
  habit: string;
  date: string;
  text: string;
  updatedAt: string;
};
export type SummationEventExportRow = SummationEventRow & {
  habit: string;
};

type TotalRow = { total: number; eventCount: number };
type FirstDateRow = { date: string };
type HabitHydrationMetadataRow = {
  displayName: string | null;
  firstDate: string | null;
};
type UserPasswordRow = { passwordHash: string };
type UserAdminRow = { admin: number };
type UserBetaTesterRow = { beta_tester: number };
type UserDemoRow = { demo_user: number };
type UserProfileCols = {
  display_name: string | null;
  theme: string | null;
  email: string | null;
  created_at: string;
};
type UserListRow = {
  username: string;
  display_name: string | null;
  email: string | null;
  last_login_at: number | null;
  web_and_api_version: string | null;
};

const insertUserStmt = db.prepare<{
  username: string;
  passwordHash: string;
  admin: number;
  createdAt: string;
}>(`
  INSERT INTO users (username, pin, admin, display_name, theme, email, created_at)
  VALUES (@username, @passwordHash, @admin, NULL, NULL, NULL, @createdAt)
  ON CONFLICT(username) DO UPDATE SET
    pin = excluded.pin,
    admin = excluded.admin,
    created_at = coalesce(nullif(trim(created_at), ''), excluded.created_at)
`);

const getUserPasswordStmt = db.prepare<[string], UserPasswordRow>(
  'SELECT pin AS passwordHash FROM users WHERE username = ?',
);

const getUsernameByEmailStmt = db.prepare<[string], { username: string }>(
  `SELECT username FROM users WHERE lower(trim(email)) = lower(trim(?))`,
);

const getPasswordResetRequestStmt = db.prepare<[string], { requested_at: number }>(
  'SELECT requested_at FROM password_reset_requests WHERE username = ?',
);

const upsertPasswordResetRequestStmt = db.prepare<{ username: string; requested_at: number }>(`
  INSERT INTO password_reset_requests (username, requested_at)
  VALUES (@username, @requested_at)
  ON CONFLICT(username) DO UPDATE SET requested_at = excluded.requested_at
`);

const invalidateActivePasswordResetTokensStmt = db.prepare<{
  userId: string;
  purpose: string;
  usedAt: number;
}>(`
  UPDATE password_reset_tokens
  SET used_at = @usedAt
  WHERE user_id = @userId AND used_at IS NULL AND purpose = @purpose
`);

const insertPasswordResetTokenStmt = db.prepare<{
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
  purpose: string;
}>(`
  INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at, purpose)
  VALUES (@userId, @tokenHash, @expiresAt, @createdAt, @purpose)
`);

const findValidPasswordResetTokenStmt = db.prepare<
  [string, number],
  { id: number; user_id: string; purpose: string }
>(`
  SELECT id, user_id, purpose
  FROM password_reset_tokens
  WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
`);

const markPasswordResetTokenUsedStmt = db.prepare<{ id: number; usedAt: number }>(`
  UPDATE password_reset_tokens SET used_at = @usedAt WHERE id = @id AND used_at IS NULL
`);

const userExistsStmt = db.prepare<[string], { username: string }>(
  'SELECT username FROM users WHERE username = ?',
);

const emailUsedByOtherStmt = db.prepare<[string, string], { username: string }>(
  `SELECT username FROM users WHERE lower(trim(email)) = lower(trim(?)) AND username != ?`,
);

const getUserProfileStmt = db.prepare<[string], UserProfileCols>(
  `SELECT display_name, theme, email,
     coalesce(nullif(trim(created_at), ''), datetime('now')) AS created_at
   FROM users WHERE username = ?`,
);

const updateLoginPasswordStmt = db.prepare<{ username: string; passwordHash: string }>(`
  UPDATE users SET pin = @passwordHash WHERE username = @username
`);

const getUserAdminStmt = db.prepare<[string], UserAdminRow>(
  'SELECT admin FROM users WHERE username = ?',
);

const getUserBetaTesterStmt = db.prepare<[string], UserBetaTesterRow>(
  'SELECT beta_tester FROM users WHERE username = ?',
);

const getUserDemoStmt = db.prepare<[string], UserDemoRow>(
  'SELECT demo_user FROM users WHERE username = ?',
);

const setUserDemoStmt = db.prepare<{ username: string; demoUser: number }>(
  'UPDATE users SET demo_user = @demoUser WHERE username = @username',
);

const renameUserAuthRecordStmt = db.prepare<{ fromUsername: string; toUsername: string }>(`
  UPDATE users
  SET username = @toUsername
  WHERE username = @fromUsername
`);

const deleteUserAuthRecordStmt = db.prepare<[string], unknown>(
  'DELETE FROM users WHERE username = ?',
);

const recordUserLoginMetadataStmt = db.prepare<{
  username: string;
  lastLoginAt: number;
  webAndApiVersion: string;
}>(`
  UPDATE users
  SET
    last_login_at = @lastLoginAt,
    web_and_api_version = @webAndApiVersion
  WHERE username = @username
`);

const listUserRowsStmt = db.prepare<[], UserListRow>(`
  SELECT username, display_name, email, last_login_at, web_and_api_version
  FROM users
`);

const hasUsersStmt = db.prepare<[], { has_users: number }>(`
  SELECT EXISTS(SELECT 1 FROM users LIMIT 1) AS has_users
`);

const countUserEventsStmt = db.prepare<[string, string, string], { event_count: number }>(`
  SELECT
    (SELECT COUNT(*) FROM habit_summation_events WHERE user = ?) +
    (SELECT COUNT(*) FROM habit_daily_selects WHERE user = ?) +
    (SELECT COUNT(*) FROM habit_text WHERE user = ?) AS event_count
`);

const getLatestHabitConfigVersionStmt = db.prepare<[string], { version: number }>(`
  SELECT version
  FROM habit_configs
  WHERE user = ?
  ORDER BY version DESC
  LIMIT 1
`);

const backfillActiveHabitConfigVersionStmt = db.prepare<{
  username: string;
  version: number;
}>(`
  UPDATE users
  SET active_habit_config_version = @version
  WHERE username = @username AND active_habit_config_version IS NULL
`);

function backfillActiveHabitConfigVersion(username: string): void {
  const latest = getLatestHabitConfigVersionStmt.get(username);
  if (!latest) return;
  backfillActiveHabitConfigVersionStmt.run({ username, version: latest.version });
}

export function setUserPassword(username: string, password: string): void {
  const existing = getUserAdminStmt.get(username);
  insertUserStmt.run({
    username,
    passwordHash: hashPassword(password),
    admin: existing?.admin ?? 0,
    createdAt: new Date().toISOString(),
  });
  backfillActiveHabitConfigVersion(username);
}

export function countAdmins(): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users WHERE admin = 1').get() as { n: number };
  return row.n;
}

const createInitialAdminUserStmt = db.prepare<{
  username: string;
  passwordHash: string;
  createdAt: string;
}>(
  `
  INSERT INTO users (username, pin, admin, display_name, theme, email, created_at)
  VALUES (@username, @passwordHash, 1, NULL, 'dark', NULL, @createdAt)
`,
);

const createFirstAdminUserStmt = db.prepare<{
  username: string;
  passwordHash: string;
  createdAt: string;
}>(`
  INSERT INTO users (username, pin, admin, display_name, theme, email, created_at)
  SELECT @username, @passwordHash, 1, NULL, 'dark', NULL, @createdAt
  WHERE NOT EXISTS (SELECT 1 FROM users)
`);

export function createInitialAdminUser(username: string, password: string): void {
  createInitialAdminUserStmt.run({
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  backfillActiveHabitConfigVersion(username);
}

/** Atomically creates an administrator only when the database has no users. */
export function createFirstAdminUser(username: string, password: string): boolean {
  const result = createFirstAdminUserStmt.run({
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  if (result.changes === 0) return false;
  backfillActiveHabitConfigVersion(username);
  return true;
}

/** Updates the stored login password only; preserves `admin`. Returns whether a row existed. */
export function updateLoginPassword(username: string, password: string): boolean {
  const result = updateLoginPasswordStmt.run({
    username,
    passwordHash: hashPassword(password),
  });
  return result.changes > 0;
}

export function renameUserAuthRecord(fromUsername: string, toUsername: string): void {
  renameUserAuthRecordStmt.run({ fromUsername, toUsername });
  renameSessionsUsername(fromUsername, toUsername);
  renameUserHabitData(fromUsername, toUsername);
}

export function deleteUserAuthRecord(username: string): void {
  deleteSessionsForUsername(username);
  deleteUserAuthRecordStmt.run(username);
}

export function isUserPasswordValid(username: string, password: string): boolean {
  const row = getUserPasswordStmt.get(username);
  if (!row) return false;
  if (!verifyPassword(password, row.passwordHash)) return false;
  if (!isPasswordHashed(row.passwordHash)) {
    updateLoginPassword(username, password);
  }
  return true;
}

export function recordUserLoginMetadata(
  username: string,
  webAndApiVersion: string,
  lastLoginAt = Math.floor(Date.now() / 1000),
): void {
  recordUserLoginMetadataStmt.run({ username, lastLoginAt, webAndApiVersion });
}

export function listUserRows(): Array<{
  username: string;
  displayName: string | null;
  email: string | null;
  lastLoginAt: number | null;
  webAndApiVersion: string | null;
}> {
  return listUserRowsStmt.all().map((row) => ({
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    lastLoginAt: row.last_login_at,
    webAndApiVersion: row.web_and_api_version,
  }));
}

export function hasUsers(): boolean {
  return hasUsersStmt.get()?.has_users === 1;
}

export function countUserEvents(username: string): number {
  return countUserEventsStmt.get(username, username, username)?.event_count ?? 0;
}

/** Maps a login id (YAML username or stored email) to the account username. */
export function resolveUsernameByLoginId(loginId: string): string | null {
  const trimmed = loginId.trim();
  if (!trimmed) return null;

  if (isPlausibleEmail(trimmed)) {
    const row = getUsernameByEmailStmt.get(trimmed);
    return row?.username ?? null;
  }

  const row = userExistsStmt.get(trimmed);
  return row?.username ?? null;
}

/** Seconds until another password-reset email can be sent; `0` when allowed. */
export function passwordResetRetryAfterSeconds(
  username: string,
  nowSec = Math.floor(Date.now() / 1000),
): number {
  const row = getPasswordResetRequestStmt.get(username);
  if (!row) return 0;
  const elapsed = nowSec - row.requested_at;
  if (elapsed >= PASSWORD_RESET_COOLDOWN_SECONDS) return 0;
  return PASSWORD_RESET_COOLDOWN_SECONDS - elapsed;
}

export function recordPasswordResetRequest(
  username: string,
  nowSec = Math.floor(Date.now() / 1000),
): void {
  upsertPasswordResetRequestStmt.run({ username, requested_at: nowSec });
}

export function invalidateActivePasswordResetTokens(
  userId: string,
  purpose: string,
  usedAt = Math.floor(Date.now() / 1000),
): void {
  invalidateActivePasswordResetTokensStmt.run({ userId, purpose, usedAt });
}

export function insertPasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
  purpose: string;
}): number {
  const result = insertPasswordResetTokenStmt.run(input);
  return Number(result.lastInsertRowid);
}

export function findValidPasswordResetToken(
  tokenHash: string,
  nowSec = Math.floor(Date.now() / 1000),
): { id: number; userId: string; purpose: string } | null {
  const row = findValidPasswordResetTokenStmt.get(tokenHash, nowSec);
  if (!row) return null;
  return { id: row.id, userId: row.user_id, purpose: row.purpose };
}

export function markPasswordResetTokenUsed(
  id: number,
  usedAt = Math.floor(Date.now() / 1000),
): boolean {
  const result = markPasswordResetTokenUsedStmt.run({ id, usedAt });
  return result.changes > 0;
}

export function isEmailUsedByOtherUser(email: string, exceptUsername: string): boolean {
  return emailUsedByOtherStmt.get(email, exceptUsername) != null;
}

export function isUserAdmin(username: string): boolean {
  const row = getUserAdminStmt.get(username);
  return row?.admin === 1;
}

/** Whether the user row grants the `BETA_TESTER` product entitlement (`users.beta_tester`). */
export function isUserBetaTester(username: string): boolean {
  const row = getUserBetaTesterStmt.get(username);
  return row?.beta_tester === 1;
}

export function isDemoUser(username: string): boolean {
  return getUserDemoStmt.get(username)?.demo_user === 1;
}

export function setUserDemo(username: string, demoUser: boolean): boolean {
  return setUserDemoStmt.run({ username, demoUser: demoUser ? 1 : 0 }).changes > 0;
}

export function getUserProfile(username: string): {
  displayName: string | null;
  theme: string | null;
  email: string | null;
  /** Non-empty stored or synthetic ISO string (row missing until first sync). */
  createdAt: string;
} {
  const row = getUserProfileStmt.get(username);
  if (!row) {
    return {
      displayName: null,
      theme: null,
      email: null,
      createdAt: new Date().toISOString(),
    };
  }
  const theme = row.theme == null ? null : isAllowedUiTheme(row.theme) ? row.theme : 'dark';
  return {
    displayName: row.display_name,
    theme,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function patchUserProfile(
  username: string,
  patch: { displayName?: string | null; theme?: string | null; email?: string },
): void {
  const sets: string[] = [];
  const params: Record<string, unknown> = { username };
  if ('displayName' in patch) {
    sets.push('display_name = @displayName');
    const v = patch.displayName;
    params.displayName = v === null || v === undefined ? null : String(v).trim() || null;
  }
  if ('theme' in patch && patch.theme !== undefined) {
    sets.push('theme = @theme');
    params.theme = patch.theme;
  }
  if ('email' in patch) {
    sets.push('email = @email');
    const v = patch.email;
    const normalized = String(v).trim().toLowerCase();
    if (!isPlausibleEmail(normalized)) {
      throw new Error('invalid email');
    }
    params.email = normalized;
  }
  if (sets.length === 0) return;
  const stmt = db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE username = @username`);
  const result = stmt.run(
    params as {
      username: string;
      displayName?: string | null;
      theme?: string | null;
      email?: string | null;
    },
  );
  if (result.changes === 0) {
    throw new Error('user row missing');
  }
}

type SessionRow = { username: string; expires_at: string };
type SessionListRow = { id: string; created_at: string; expires_at: string };

const insertSessionStmt = db.prepare<{ id: string; username: string; expiresAt: string }>(`
  INSERT INTO sessions (id, username, expires_at)
  VALUES (@id, @username, @expiresAt)
`);

const getSessionStmt = db.prepare<[string], SessionRow>(
  'SELECT username, expires_at FROM sessions WHERE id = ?',
);

const deleteSessionStmt = db.prepare<[string], unknown>('DELETE FROM sessions WHERE id = ?');

const renameSessionsUsernameStmt = db.prepare<{ fromUsername: string; toUsername: string }>(`
  UPDATE sessions
  SET username = @toUsername
  WHERE username = @fromUsername
`);

const deleteSessionsForUsernameStmt = db.prepare<[string], unknown>(
  'DELETE FROM sessions WHERE username = ?',
);

const listSessionsForUsernameStmt = db.prepare<[string], SessionListRow>(`
  SELECT id, created_at, expires_at
  FROM sessions
  WHERE username = ?
  ORDER BY datetime(created_at) DESC
`);

const SESSION_TOKEN_PREFIX_LEN = 8;
export const OUC_SESSION_ID_PREFIX = 'OUC_';

export function isOucSessionId(sessionId: string): boolean {
  return sessionId.startsWith(OUC_SESSION_ID_PREFIX);
}

function normalizeSessionTokenPrefix(tokenPrefix: string): string | null {
  if (/^OUC_[0-9a-f]{4}$/i.test(tokenPrefix)) {
    return `${OUC_SESSION_ID_PREFIX}${tokenPrefix.slice(4).toLowerCase()}`;
  }
  if (new RegExp(`^[0-9a-f]{${SESSION_TOKEN_PREFIX_LEN}}$`, 'i').test(tokenPrefix)) {
    return tokenPrefix.toLowerCase();
  }
  return null;
}

const findSessionIdsByTokenPrefixStmt = db.prepare<[string, string], { id: string }>(`
  SELECT id
  FROM sessions
  WHERE username = ? AND substr(id, 1, ${SESSION_TOKEN_PREFIX_LEN}) = ?
`);

const revokeOtherSessionsStmt = db.prepare<{ username: string; exceptId: string }>(`
  DELETE FROM sessions
  WHERE username = @username AND id != @exceptId
`);

export type RevokeSessionByPrefixError =
  | 'invalid token'
  | 'session not found'
  | 'ambiguous session token'
  | 'cannot revoke active session';

export function revokeUserSessionByTokenPrefix(
  username: string,
  tokenPrefix: string,
  currentSessionId: string | undefined,
): { ok: true } | { ok: false; error: RevokeSessionByPrefixError } {
  const normalized = normalizeSessionTokenPrefix(tokenPrefix);
  if (normalized == null) {
    return { ok: false, error: 'invalid token' };
  }

  const rows = findSessionIdsByTokenPrefixStmt.all(username, normalized);
  if (rows.length === 0) {
    return { ok: false, error: 'session not found' };
  }
  if (rows.length > 1) {
    return { ok: false, error: 'ambiguous session token' };
  }

  const sessionId = rows[0].id;
  if (currentSessionId != null && sessionId === currentSessionId) {
    return { ok: false, error: 'cannot revoke active session' };
  }

  deleteSessionStmt.run(sessionId);
  return { ok: true };
}

export function revokeOtherUserSessions(username: string, exceptSessionId: string): number {
  const result = revokeOtherSessionsStmt.run({ username, exceptId: exceptSessionId });
  return result.changes;
}

export function createUserSession(username: string, ttlSeconds: number): string {
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  insertSessionStmt.run({ id, username, expiresAt });
  return id;
}

export function createOucUserSession(username: string, ttlSeconds: number): string {
  const id = OUC_SESSION_ID_PREFIX + randomBytes(29).toString('hex');
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  insertSessionStmt.run({ id, username, expiresAt });
  return id;
}

export function getUsernameForSession(sessionId: string): string | null {
  const row = getSessionStmt.get(sessionId);
  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    deleteSessionStmt.run(sessionId);
    return null;
  }
  return row.username;
}

export function revokeUserSession(sessionId: string): void {
  deleteSessionStmt.run(sessionId);
}

export function renameSessionsUsername(fromUsername: string, toUsername: string): void {
  renameSessionsUsernameStmt.run({ fromUsername, toUsername });
}

export function deleteSessionsForUsername(username: string): void {
  deleteSessionsForUsernameStmt.run(username);
}

export function listSessionsForUsername(username: string): SessionListRow[] {
  return listSessionsForUsernameStmt.all(username);
}

const getDailyTotalStmt = db.prepare<[string, string, string], TotalRow>(
  `
    SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS eventCount
    FROM habit_summation_events
    WHERE user = ? AND habit = ? AND date = ?
  `,
);

const insertSummationEventStmt = db.prepare<
  {
    user: string;
    habit: string;
    date: string;
    amount: number;
    createdAt: string;
  },
  SummationEventRow
>(`
  INSERT INTO habit_summation_events (user, habit, date, amount, created_at)
  VALUES (@user, @habit, @date, @amount, @createdAt)
  RETURNING id, date, amount, created_at AS createdAt
`);

const deleteSummationEventsForDayStmt = db.prepare<{
  user: string;
  habit: string;
  date: string;
}>(`
  DELETE FROM habit_summation_events
  WHERE user = @user AND habit = @habit AND date = @date
`);

const deleteSummationEventStmt = db.prepare<{
  user: string;
  habit: string;
  date: string;
  id: number;
}>(`
  DELETE FROM habit_summation_events
  WHERE user = @user AND habit = @habit AND date = @date AND id = @id
`);

const firstDateStmt = db.prepare<[string, string, string], FirstDateRow>(`
  SELECT MIN(date) AS date
  FROM (
    SELECT date FROM habit_summation_events WHERE user = ?
    UNION ALL
    SELECT date FROM habit_daily_selects WHERE user = ?
    UNION ALL
    SELECT date FROM habit_text WHERE user = ?
  )
`);

const habitHydrationMetadataStmt = db.prepare<
  [string, string, string, string],
  HabitHydrationMetadataRow
>(`
  SELECT
    (SELECT display_name FROM users WHERE username = ?) AS displayName,
    (
      SELECT MIN(date)
      FROM (
        SELECT date FROM habit_summation_events WHERE user = ?
        UNION ALL
        SELECT date FROM habit_daily_selects WHERE user = ?
        UNION ALL
        SELECT date FROM habit_text WHERE user = ?
      )
    ) AS firstDate
`);

const summationEventSeriesForUserStmt = db.prepare<
  [string, string, string],
  SummationEventExportRow
>(`
  SELECT habit, id, date, amount, created_at AS createdAt
  FROM habit_summation_events
  WHERE user = ? AND date >= ? AND date <= ?
  ORDER BY date ASC, habit ASC, id ASC
`);

const dailySelectSeriesForUserStmt = db.prepare<[string, string, string], DailySelectExportRow>(`
  SELECT habit, date, value, updated_at AS updatedAt
  FROM habit_daily_selects
  WHERE user = ? AND date >= ? AND date <= ?
  ORDER BY date ASC, habit ASC
`);

const habitTextSeriesForUserStmt = db.prepare<[string, string, string], HabitTextExportRow>(`
  SELECT habit, date, text, updated_at AS updatedAt
  FROM habit_text
  WHERE user = ? AND date >= ? AND date <= ?
  ORDER BY date ASC, habit ASC
`);

const allDailySelectsForUserStmt = db.prepare<[string], DailySelectExportRow>(`
  SELECT habit, date, value, updated_at AS updatedAt
  FROM habit_daily_selects
  WHERE user = ?
  ORDER BY date ASC, habit ASC
`);

const allSummationEventsForUserStmt = db.prepare<[string], SummationEventExportRow>(`
  SELECT habit, id, date, amount, created_at AS createdAt
  FROM habit_summation_events
  WHERE user = ?
  ORDER BY date ASC, habit ASC, id ASC
`);

const allHabitTextsForUserStmt = db.prepare<[string], HabitTextExportRow>(`
  SELECT habit, date, text, updated_at AS updatedAt
  FROM habit_text
  WHERE user = ?
  ORDER BY date ASC, habit ASC
`);

export function getFirstDate(user: string): string | null {
  const row = firstDateStmt.get(user, user, user);
  return row?.date ?? null;
}

export function getHabitHydrationMetadata(user: string): HabitHydrationMetadataRow {
  return (
    habitHydrationMetadataStmt.get(user, user, user, user) ?? {
      displayName: null,
      firstDate: null,
    }
  );
}

/** Stored total for that calendar day, or `null` when no row exists. */
export function getSummationDayTotal(user: string, habit: string, date: string): number | null {
  const row = getDailyTotalStmt.get(user, habit, date);
  return row === undefined || row.eventCount === 0 ? null : row.total;
}

export function setTotal(
  user: string,
  habit: string,
  date: string,
  total: number,
  createdAtSql: string,
): number {
  const next = Math.max(0, Math.trunc(total));
  deleteSummationEventsForDayStmt.run({ user, habit, date });
  // Explicit zero is stored as a zero-amount event so it is distinct from "no data" (null).
  insertSummationEventStmt.get({ user, habit, date, amount: next, createdAt: createdAtSql });
  return next;
}

export function addToTotal(
  user: string,
  habit: string,
  date: string,
  delta: number,
  createdAtSql: string,
): { total: number | null; event: SummationEventRow | null } {
  const current = getSummationDayTotal(user, habit, date);
  const base = current ?? 0;
  const requested = Math.trunc(delta);
  const amount = requested < 0 ? Math.max(requested, -base) : requested;
  if (amount === 0) {
    if (current != null) return { total: current, event: null };
    const event = insertSummationEventStmt.get({
      user,
      habit,
      date,
      amount: 0,
      createdAt: createdAtSql,
    });
    if (!event) throw new Error('failed to record summation event');
    return { total: 0, event };
  }

  const event = insertSummationEventStmt.get({
    user,
    habit,
    date,
    amount,
    createdAt: createdAtSql,
  });
  if (!event) throw new Error('failed to record summation event');
  return { total: base + amount, event };
}

export function deleteSummationEventsForDay(user: string, habit: string, date: string): void {
  deleteSummationEventsForDayStmt.run({ user, habit, date });
}

/** Returns whether a row was removed (scoped to user, habit, and calendar day). */
export function deleteSummationEvent(
  user: string,
  habit: string,
  date: string,
  id: number,
): boolean {
  const result = deleteSummationEventStmt.run({ user, habit, date, id });
  return result.changes > 0;
}

export function getSummationEventSeriesForUser(
  user: string,
  startDate: string,
  endDate: string,
): SummationEventExportRow[] {
  return summationEventSeriesForUserStmt.all(user, startDate, endDate);
}

export function getDailySelectSeriesForUser(
  user: string,
  startDate: string,
  endDate: string,
): DailySelectExportRow[] {
  return dailySelectSeriesForUserStmt.all(user, startDate, endDate);
}

export function getHabitTextSeriesForUser(
  user: string,
  startDate: string,
  endDate: string,
): HabitTextExportRow[] {
  return habitTextSeriesForUserStmt.all(user, startDate, endDate);
}

export function getAllDailySelectsForUser(user: string): DailySelectExportRow[] {
  return allDailySelectsForUserStmt.all(user);
}

export function getAllSummationEventsForUser(user: string): SummationEventExportRow[] {
  return allSummationEventsForUserStmt.all(user);
}

export function getAllHabitTextsForUser(user: string): HabitTextExportRow[] {
  return allHabitTextsForUserStmt.all(user);
}

const upsertSelectStmt = db.prepare<{
  user: string;
  habit: string;
  date: string;
  value: string;
}>(`
  INSERT INTO habit_daily_selects (user, habit, date, value, updated_at)
  VALUES (@user, @habit, @date, @value, datetime('now'))
  ON CONFLICT(user, habit, date) DO UPDATE SET
    value = excluded.value,
    updated_at = excluded.updated_at
`);

export function setSelect(user: string, habit: string, date: string, value: string): string {
  upsertSelectStmt.run({ user, habit, date, value });
  return value;
}

const deleteDailySelectStmt = db.prepare<[string, string, string], unknown>(
  'DELETE FROM habit_daily_selects WHERE user = ? AND habit = ? AND date = ?',
);

export function deleteDailySelect(user: string, habit: string, date: string): void {
  deleteDailySelectStmt.run(user, habit, date);
}

const upsertHabitTextStmt = db.prepare<{
  user: string;
  habit: string;
  date: string;
  text: string;
}>(`
  INSERT INTO habit_text (user, habit, date, text, updated_at)
  VALUES (@user, @habit, @date, @text, datetime('now'))
  ON CONFLICT(user, habit, date) DO UPDATE SET
    text = excluded.text,
    updated_at = excluded.updated_at
`);

export function setHabitText(user: string, habit: string, date: string, text: string): string {
  upsertHabitTextStmt.run({ user, habit, date, text });
  return text;
}

const deleteHabitTextStmt = db.prepare<[string, string, string], unknown>(
  'DELETE FROM habit_text WHERE user = ? AND habit = ? AND date = ?',
);

export function deleteHabitText(user: string, habit: string, date: string): void {
  deleteHabitTextStmt.run(user, habit, date);
}

const deleteDailySelectValueStmt = db.prepare<{
  user: string;
  habit: string;
  value: string;
}>(`
  DELETE FROM habit_daily_selects
  WHERE user = @user AND habit = @habit AND value = @value
`);

export function deleteDailySelectValue(user: string, habit: string, value: string): void {
  deleteDailySelectValueStmt.run({ user, habit, value });
}

const renameSummationHabitStmt = db.prepare<{
  user: string;
  fromHabit: string;
  toHabit: string;
}>(`
  UPDATE habit_summation_events
  SET habit = @toHabit
  WHERE user = @user AND habit = @fromHabit
`);

const renameDailySelectsHabitStmt = db.prepare<{
  user: string;
  fromHabit: string;
  toHabit: string;
}>(`
  UPDATE habit_daily_selects
  SET habit = @toHabit
  WHERE user = @user AND habit = @fromHabit
`);

const renameHabitTextHabitStmt = db.prepare<{
  user: string;
  fromHabit: string;
  toHabit: string;
}>(`
  UPDATE habit_text
  SET habit = @toHabit
  WHERE user = @user AND habit = @fromHabit
`);

const renameDailySelectValueStmt = db.prepare<{
  user: string;
  habit: string;
  fromValue: string;
  toValue: string;
}>(`
  UPDATE habit_daily_selects
  SET value = @toValue
  WHERE user = @user AND habit = @habit AND value = @fromValue
`);

export function renameHabitData(user: string, fromHabit: string, toHabit: string): void {
  renameSummationHabitStmt.run({ user, fromHabit, toHabit });
  renameDailySelectsHabitStmt.run({ user, fromHabit, toHabit });
  renameHabitTextHabitStmt.run({ user, fromHabit, toHabit });
}

export function renameDailySelectValue(
  user: string,
  habit: string,
  fromValue: string,
  toValue: string,
): void {
  renameDailySelectValueStmt.run({ user, habit, fromValue, toValue });
}

const renameSummationEventsUserStmt = db.prepare<{ fromUsername: string; toUsername: string }>(`
  UPDATE habit_summation_events
  SET user = @toUsername
  WHERE user = @fromUsername
`);

const renameDailySelectsUserStmt = db.prepare<{ fromUsername: string; toUsername: string }>(`
  UPDATE habit_daily_selects
  SET user = @toUsername
  WHERE user = @fromUsername
`);

const renameHabitTextUserStmt = db.prepare<{ fromUsername: string; toUsername: string }>(`
  UPDATE habit_text
  SET user = @toUsername
  WHERE user = @fromUsername
`);

function renameUserHabitData(fromUsername: string, toUsername: string): void {
  renameSummationEventsUserStmt.run({ fromUsername, toUsername });
  renameDailySelectsUserStmt.run({ fromUsername, toUsername });
  renameHabitTextUserStmt.run({ fromUsername, toUsername });
}

export function purgeUserData(user: string) {
  db.prepare('DELETE FROM habit_summation_events WHERE user = ?').run(user);
  db.prepare('DELETE FROM habit_daily_selects WHERE user = ?').run(user);
  db.prepare('DELETE FROM habit_text WHERE user = ?').run(user);
}

export function closeDb() {
  if (db.open) db.close();
}
