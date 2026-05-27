import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { hashPassword, isPasswordHashed, verifyPassword } from './password-hash.js';
import { PASSWORD_RESET_COOLDOWN_SECONDS } from './constants.js';
import { isAllowedUiTheme, isPlausibleEmail } from './request-helpers.js';

const rawDir = process.env.HABSUM_CONFIG_DIR;
if (!rawDir) {
  throw new Error('[habsum] HABSUM_CONFIG_DIR is required (must point to your data directory)');
}

const DATA_DIR = resolve(rawDir);
const DB_PATH = join(DATA_DIR, 'habsum.db');
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
  db.exec(`ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark'`);
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
if (!usersTableHasColumn('force_password_reset')) {
  db.exec('ALTER TABLE users ADD COLUMN force_password_reset INTEGER NOT NULL DEFAULT 0');
}

const migratePlainTextPinStmt = db.prepare<{ username: string; pin: string }>(`
  UPDATE users SET pin = @pin WHERE username = @username
`);

/** Re-hash any legacy plain-text pins left in the database. */
function migratePlainTextPins(): void {
  const rows = db.prepare('SELECT username, pin FROM users').all() as Array<{
    username: string;
    pin: string;
  }>;
  for (const row of rows) {
    if (!isPasswordHashed(row.pin)) {
      migratePlainTextPinStmt.run({ username: row.username, pin: hashPassword(row.pin) });
    }
  }
}

migratePlainTextPins();

db.exec(`
  UPDATE users SET email = 'mlisbit@gmail.com' WHERE username = 'user';
  UPDATE users SET email = 'mlisbit@proton.me' WHERE username = 'mac';
`);

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
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
    ON password_reset_tokens (user_id);

  CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_hash_unique
    ON password_reset_tokens (token_hash);
`);

export type SummationEventRow = {
  id: number;
  date: string;
  amount: number;
  createdAt: string;
};

type TotalRow = { total: number; eventCount: number };
type FirstDateRow = { date: string };
type SeriesRow = { date: string; total: number };
type SelectRow = { value: string };
type SelectSeriesRow = { date: string; value: string };
type UserPinRow = { pin: string };
type UserAdminRow = { admin: number };
type UserBetaTesterRow = { beta_tester: number };
type UserForcePasswordResetRow = { force_password_reset: number };

type UserProfileCols = {
  display_name: string | null;
  theme: string | null;
  email: string | null;
  created_at: string;
};

const insertUserStmt = db.prepare<{
  username: string;
  pin: string;
  admin: number;
  createdAt: string;
}>(`
  INSERT INTO users (username, pin, admin, display_name, theme, email, created_at)
  VALUES (@username, @pin, @admin, NULL, 'dark', NULL, @createdAt)
  ON CONFLICT(username) DO UPDATE SET
    pin = excluded.pin,
    admin = excluded.admin,
    created_at = coalesce(nullif(trim(created_at), ''), excluded.created_at)
`);

const ensureUserStmt = db.prepare<{
  username: string;
  pin: string;
  admin: number;
  createdAt: string;
}>(`
  INSERT OR IGNORE INTO users (username, pin, admin, display_name, theme, email, created_at)
  VALUES (@username, @pin, @admin, NULL, 'dark', NULL, @createdAt)
`);

const getUserPinStmt = db.prepare<[string], UserPinRow>('SELECT pin FROM users WHERE username = ?');

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

const invalidateActivePasswordResetTokensStmt = db.prepare<{ userId: string; usedAt: number }>(`
  UPDATE password_reset_tokens
  SET used_at = @usedAt
  WHERE user_id = @userId AND used_at IS NULL
`);

const insertPasswordResetTokenStmt = db.prepare<{
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
}>(`
  INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
  VALUES (@userId, @tokenHash, @expiresAt, @createdAt)
`);

const findValidPasswordResetTokenStmt = db.prepare<
  [string, number],
  { id: number; user_id: string }
>(`
  SELECT id, user_id
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

const updateLoginPinStmt = db.prepare<{ username: string; pin: string }>(`
  UPDATE users SET pin = @pin WHERE username = @username
`);

const getUserAdminStmt = db.prepare<[string], UserAdminRow>(
  'SELECT admin FROM users WHERE username = ?',
);

const getUserBetaTesterStmt = db.prepare<[string], UserBetaTesterRow>(
  'SELECT beta_tester FROM users WHERE username = ?',
);

const getUserForcePasswordResetStmt = db.prepare<[string], UserForcePasswordResetRow>(
  'SELECT force_password_reset FROM users WHERE username = ?',
);

const setUserForcePasswordResetStmt = db.prepare<{ username: string; value: number }>(`
  UPDATE users SET force_password_reset = @value WHERE username = @username
`);

const clearUserForcePasswordResetStmt = db.prepare<[string], unknown>(`
  UPDATE users SET force_password_reset = 0 WHERE username = ?
`);

const renameUserPinStmt = db.prepare<{ fromUsername: string; toUsername: string }>(`
  UPDATE users
  SET username = @toUsername
  WHERE username = @fromUsername
`);

const deleteUserPinStmt = db.prepare<[string], unknown>('DELETE FROM users WHERE username = ?');

export function ensureUserPins(usernames: string[], defaultPin = '0'): void {
  const createdAt = new Date().toISOString();
  const storedPin = hashPassword(defaultPin);
  for (const username of usernames) {
    ensureUserStmt.run({
      username,
      pin: storedPin,
      admin: 0,
      createdAt,
    });
  }
}

export function setUserPin(username: string, pin: string): void {
  const existing = getUserAdminStmt.get(username);
  insertUserStmt.run({
    username,
    pin: hashPassword(pin),
    admin: existing?.admin ?? 0,
    createdAt: new Date().toISOString(),
  });
}

export function countAdmins(): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users WHERE admin = 1').get() as { n: number };
  return row.n;
}

const createInitialAdminUserStmt = db.prepare<{ username: string; pin: string; createdAt: string }>(
  `
  INSERT INTO users (username, pin, admin, display_name, theme, email, created_at)
  VALUES (@username, @pin, 1, NULL, 'dark', NULL, @createdAt)
`,
);

/** Creates the first admin account (call only when {@link countAdmins} is zero). */
export function createInitialAdminUser(username: string, pin: string): void {
  createInitialAdminUserStmt.run({
    username,
    pin: hashPassword(pin),
    createdAt: new Date().toISOString(),
  });
}

/** Updates stored login PIN only; preserves `admin`. Returns whether a row existed. */
export function updateLoginPin(username: string, pin: string): boolean {
  const result = updateLoginPinStmt.run({ username, pin: hashPassword(pin) });
  return result.changes > 0;
}

/** Whether the account must set a new login password before using the app. */
export function isUserForcePasswordReset(username: string): boolean {
  const row = getUserForcePasswordResetStmt.get(username);
  return row?.force_password_reset === 1;
}

export function setUserForcePasswordReset(username: string, force: boolean): void {
  setUserForcePasswordResetStmt.run({ username, value: force ? 1 : 0 });
}

export function clearUserForcePasswordReset(username: string): void {
  clearUserForcePasswordResetStmt.run(username);
}

/** Sets login PIN and clears `force_password_reset`. Returns whether a user row existed. */
export function completeForcedPasswordReset(username: string, pin: string): boolean {
  const updated = updateLoginPin(username, pin);
  if (updated) clearUserForcePasswordReset(username);
  return updated;
}

export function renameUserPin(fromUsername: string, toUsername: string): void {
  renameUserPinStmt.run({ fromUsername, toUsername });
  renameSessionsUsername(fromUsername, toUsername);
  renameUserHabitData(fromUsername, toUsername);
}

export function deleteUserPin(username: string): void {
  deleteSessionsForUsername(username);
  deleteUserPinStmt.run(username);
}

export function isUserPinValid(username: string, pin: string): boolean {
  const row = getUserPinStmt.get(username);
  if (!row) return false;
  if (!verifyPassword(pin, row.pin)) return false;
  if (!isPasswordHashed(row.pin)) {
    updateLoginPin(username, pin);
  }
  return true;
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
  usedAt = Math.floor(Date.now() / 1000),
): void {
  invalidateActivePasswordResetTokensStmt.run({ userId, usedAt });
}

export function insertPasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
}): number {
  const result = insertPasswordResetTokenStmt.run(input);
  return Number(result.lastInsertRowid);
}

export function findValidPasswordResetToken(
  tokenHash: string,
  nowSec = Math.floor(Date.now() / 1000),
): { id: number; userId: string } | null {
  const row = findValidPasswordResetTokenStmt.get(tokenHash, nowSec);
  if (!row) return null;
  return { id: row.id, userId: row.user_id };
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

export function getUserProfile(username: string): {
  displayName: string | null;
  theme: string;
  email: string | null;
  /** Non-empty stored or synthetic ISO string (row missing until first sync). */
  createdAt: string;
} {
  const row = getUserProfileStmt.get(username);
  if (!row) {
    return {
      displayName: null,
      theme: 'dark',
      email: null,
      createdAt: new Date().toISOString(),
    };
  }
  const theme = row.theme != null && isAllowedUiTheme(row.theme) ? row.theme : 'dark';
  return {
    displayName: row.display_name,
    theme,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function patchUserProfile(
  username: string,
  patch: { displayName?: string | null; theme?: string; email?: string },
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
  let result = stmt.run(
    params as {
      username: string;
      displayName?: string | null;
      theme?: string;
      email?: string | null;
    },
  );
  if (result.changes === 0) {
    ensureUserPins([username]);
    result = stmt.run(
      params as {
        username: string;
        displayName?: string | null;
        theme?: string;
        email?: string | null;
      },
    );
  }
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

export function isValidSessionTokenPrefix(token: string): boolean {
  return normalizeSessionTokenPrefix(token) != null;
}

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

const firstDateStmt = db.prepare<[string, string], FirstDateRow>(`
  SELECT MIN(date) AS date
  FROM (
    SELECT date FROM habit_summation_events WHERE user = ?
    UNION ALL
    SELECT date FROM habit_daily_selects WHERE user = ?
  )
`);

const seriesStmt = db.prepare<[string, string, string, string], SeriesRow>(`
  SELECT date, SUM(amount) AS total
  FROM habit_summation_events
  WHERE user = ? AND habit = ? AND date >= ? AND date <= ?
  GROUP BY date
  ORDER BY date ASC
`);

const allTotalsStmt = db.prepare<[string, string], SeriesRow>(`
  SELECT date, SUM(amount) AS total
  FROM habit_summation_events
  WHERE user = ? AND habit = ?
  GROUP BY date
  ORDER BY date ASC
`);

const summationEventsForDayStmt = db.prepare<[string, string, string], SummationEventRow>(`
  SELECT id, date, amount, created_at AS createdAt
  FROM habit_summation_events
  WHERE user = ? AND habit = ? AND date = ?
  ORDER BY id ASC
`);

const allSelectsStmt = db.prepare<[string, string], SelectSeriesRow>(`
  SELECT date, value
  FROM habit_daily_selects
  WHERE user = ? AND habit = ?
  ORDER BY date ASC
`);

const habitFirstDateStmt = db.prepare<[string, string, string, string], FirstDateRow>(`
  SELECT MIN(date) AS date
  FROM (
    SELECT date FROM habit_summation_events WHERE user = ? AND habit = ?
    UNION ALL
    SELECT date FROM habit_daily_selects WHERE user = ? AND habit = ?
  )
`);

export function getFirstDate(user: string): string | null {
  const row = firstDateStmt.get(user, user);
  return row?.date ?? null;
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

export function getSeries(
  user: string,
  habit: string,
  startDate: string,
  endDate: string,
): Array<{ date: string; total: number }> {
  return seriesStmt.all(user, habit, startDate, endDate);
}

export function getAllTotals(user: string, habit: string): Array<{ date: string; total: number }> {
  return allTotalsStmt.all(user, habit);
}

export function getSummationEvents(user: string, habit: string, date: string): SummationEventRow[] {
  return summationEventsForDayStmt.all(user, habit, date);
}

export function getAllSelects(user: string, habit: string): Array<{ date: string; value: string }> {
  return allSelectsStmt.all(user, habit);
}

export function getHabitFirstDate(user: string, habit: string): string | null {
  const row = habitFirstDateStmt.get(user, habit, user, habit);
  return row?.date ?? null;
}

const getSelectStmt = db.prepare<[string, string, string], SelectRow>(
  'SELECT value FROM habit_daily_selects WHERE user = ? AND habit = ? AND date = ?',
);

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

export function getSelect(user: string, habit: string, date: string): string | null {
  const row = getSelectStmt.get(user, habit, date);
  return row?.value ?? null;
}

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

function renameUserHabitData(fromUsername: string, toUsername: string): void {
  renameSummationEventsUserStmt.run({ fromUsername, toUsername });
  renameDailySelectsUserStmt.run({ fromUsername, toUsername });
}

export function purgeUserData(user: string) {
  db.prepare('DELETE FROM habit_summation_events WHERE user = ?').run(user);
  db.prepare('DELETE FROM habit_daily_selects WHERE user = ?').run(user);
}

export function closeDb() {
  db.close();
}
