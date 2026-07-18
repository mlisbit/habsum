// Express routes for user-scoped API endpoints; habit routes delegate to HabitService.
import { Router, type Request, type Response } from 'express';
import type {
  LoginUserRequest,
  LoginUserResponse,
  PurgeUserDataResponse,
  UserConfigGetResponse,
  UserConfigPutRequest,
  UserConfigPutResponse,
  UserSessionResponse,
} from '@habsum/types/common/misc';
import type { UserPasswordChangeRequest } from '@habsum/types/api-responses/user-password-change';
import type { SecurityGetResponse } from '@habsum/types/api-responses/security-get';
import type {
  SecuritySessionDeleteResponse,
  SecuritySessionsDeleteOthersResponse,
} from '@habsum/types/api-responses/security-delete';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import { isForbiddenUsername } from '../forbidden-usernames.js';
import {
  deleteUserConfigFile,
  listUsers,
  loadUserConfig,
  readUserConfigFileText,
  renameUserConfigFile,
  writeUserConfigFileText,
  type HabitDef,
} from '../config.js';
import {
  buildConfigDeletions,
  buildConfigMigrations,
  configResponseParts,
  serializeConfigJson,
} from '../config-editor.js';
import {
  createUserSession,
  listSessionsForUsername,
  revokeOtherUserSessions,
  revokeUserSessionByTokenPrefix,
  deleteDailySelectValue,
  deleteUserPin,
  ensureUserPins,
  getAllDailySelectsForUser,
  getAllSummationEventsForUser,
  isEmailUsedByOtherUser,
  resolveUsernameByLoginId,
  getUserProfile,
  isUserAdmin,
  isUserPinValid,
  patchUserProfile,
  purgeUserData,
  renameDailySelectValue,
  renameHabitData,
  renameUserPin,
  setUserPin,
  updateLoginPin,
} from '../db.js';
import { type PatchBody } from '../habit-presentation.js';
import { HabitService } from '../services/habit-service.js';
import { authenticatedSessionId, requireMatchingRouteUser } from '../middleware/auth.js';
import {
  isPlausibleEmail,
  isSafeConfigUserId,
  isSafeLoginId,
  loadUserConfigForResponse,
  parsePin,
  parseThemePatchInput,
} from '../request-helpers.js';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import { entitlementsForUser } from '../entitlements.js';
import { appendSessionCookie, sessionTtlSeconds } from '../session-cookie.js';

type ConfigMigrationTuple = [string, string];

type ClassifiedConfigMigrations = {
  habitRenames: ConfigMigrationTuple[];
  optionRenames: Array<{ habit: string; fromOption: string; toOption: string }>;
};

type ConfigDeletion = { habit: string; option: string };

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function csvLine(values: Array<string | number | null | undefined>): string {
  return values.map(csvCell).join(',');
}

function userDataCsv(user: string): string {
  const lines = [
    csvLine(['record_type', 'habit', 'date', 'value', 'event_id', 'amount', 'created_at']),
  ];

  for (const row of getAllDailySelectsForUser(user)) {
    lines.push(csvLine(['daily_select', row.habit, row.date, row.value, '', '', row.updatedAt]));
  }

  for (const row of getAllSummationEventsForUser(user)) {
    lines.push(
      csvLine(['summation_event', row.habit, row.date, '', row.id, row.amount, row.createdAt]),
    );
  }

  return `${lines.join('\n')}\n`;
}

function parseConfigMigrationTuples(raw: unknown): ConfigMigrationTuple[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;

  const migrations: ConfigMigrationTuple[] = [];
  for (const item of raw) {
    if (
      !Array.isArray(item) ||
      item.length !== 2 ||
      typeof item[0] !== 'string' ||
      typeof item[1] !== 'string'
    ) {
      return null;
    }
    migrations.push([item[0], item[1]]);
  }
  return migrations;
}

function parseConfigDeletions(raw: unknown): string[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  return raw.every((item): item is string => typeof item === 'string') ? raw : null;
}

function optionDeletionForPath(path: string, previousHabits: HabitDef[]): ConfigDeletion | null {
  for (const habit of previousHabits) {
    if (habit.type !== 'single_select') continue;
    for (const option of habit.options ?? []) {
      if (`${habit.name}.${option}` === path) {
        return { habit: habit.name, option };
      }
    }
  }
  return null;
}

function applyConfigDataDeletions(
  user: string,
  deletions: string[],
  previousHabits: HabitDef[],
): void {
  for (const path of deletions) {
    const deletion = optionDeletionForPath(path, previousHabits);
    if (!deletion) continue;
    deleteDailySelectValue(user, deletion.habit, deletion.option);
  }
}

function optionMigrationForHabitPair(
  fromPath: string,
  toPath: string,
  previousHabit: HabitDef,
  nextHabit: HabitDef,
): { habit: string; fromOption: string; toOption: string } | null {
  if (previousHabit.type !== 'single_select' || nextHabit.type !== 'single_select') return null;

  for (const fromOption of previousHabit.options ?? []) {
    if (`${previousHabit.name}.${fromOption}` !== fromPath) continue;
    for (const toOption of nextHabit.options ?? []) {
      if (`${nextHabit.name}.${toOption}` === toPath) {
        return { habit: nextHabit.name, fromOption, toOption };
      }
    }
  }

  return null;
}

function classifyConfigMigrations(
  migrations: ConfigMigrationTuple[],
  previousHabits: HabitDef[],
  nextHabits: HabitDef[],
): ClassifiedConfigMigrations {
  const previousByName = new Map(previousHabits.map((habit) => [habit.name, habit]));
  const nextByName = new Map(nextHabits.map((habit) => [habit.name, habit]));
  const habitRenames: ConfigMigrationTuple[] = [];
  const optionRenames: ClassifiedConfigMigrations['optionRenames'] = [];

  for (const [fromPath, toPath] of migrations) {
    const previousHabit = previousByName.get(fromPath);
    const nextHabit = nextByName.get(toPath);
    if (previousHabit && nextHabit) {
      habitRenames.push([fromPath, toPath]);
      continue;
    }

    for (const oldHabit of previousHabits) {
      for (const newHabit of nextHabits) {
        const optionRename = optionMigrationForHabitPair(fromPath, toPath, oldHabit, newHabit);
        if (optionRename) {
          optionRenames.push(optionRename);
        }
      }
    }
  }

  return { habitRenames, optionRenames };
}

function applyConfigDataMigrations(
  user: string,
  migrations: ConfigMigrationTuple[],
  previousHabits: HabitDef[],
  nextHabits: HabitDef[],
): void {
  const { habitRenames, optionRenames } = classifyConfigMigrations(
    migrations,
    previousHabits,
    nextHabits,
  );

  for (const [fromHabit, toHabit] of habitRenames) {
    renameHabitData(user, fromHabit, toHabit);
  }
  for (const { habit, fromOption, toOption } of optionRenames) {
    renameDailySelectValue(user, habit, fromOption, toOption);
  }
}

export const userScopedRouter = Router({ mergeParams: true });

/** POST /users/:user/login */
userScopedRouter.post(
  '/login',
  (req: Request<{ user: string }, unknown, LoginUserRequest>, res: Response) => {
    const loginId = req.params.user;
    if (!isSafeLoginId(loginId)) {
      return res.status(400).json({ error: 'invalid login' });
    }

    const pin = parsePin(req.body?.pin);
    if (pin == null) return res.status(400).json({ error: 'pin is required' });

    const user = resolveUsernameByLoginId(loginId);
    if (!user) {
      return res.status(401).json({ error: 'invalid password' });
    }

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;
    ensureUserPins([user]);

    if (!isUserPinValid(user, pin)) {
      return res.status(401).json({ error: 'invalid password' });
    }

    const sessionId = createUserSession(user, sessionTtlSeconds());
    appendSessionCookie(res, sessionId);
    const body: LoginUserResponse = {
      ok: true,
      user,
    };
    return res.json(body);
  },
);

/** GET /users/:user/security */
userScopedRouter.get(
  '/security',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    const currentSessionId = authenticatedSessionId(req) ?? undefined;
    const now = Date.now();
    const sessions = listSessionsForUsername(user).map((row) => ({
      token: row.id.slice(0, 8),
      createdAt: accountCreatedAtToApi(row.created_at),
      expiresAt: accountCreatedAtToApi(row.expires_at),
      isActive:
        currentSessionId != null &&
        currentSessionId === row.id &&
        new Date(row.expires_at).getTime() > now,
    }));

    const body: SecurityGetResponse = { sessions };
    return res.json(body);
  },
);

/** DELETE /users/:user/security/sessions — revoke every session except the current cookie. */
userScopedRouter.delete(
  '/security/sessions',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    const currentSessionId = authenticatedSessionId(req);
    if (currentSessionId == null) {
      return res.status(400).json({ error: 'no active session' });
    }

    const revoked = revokeOtherUserSessions(user, currentSessionId);
    const body: SecuritySessionsDeleteOthersResponse = { ok: true, revoked };
    return res.json(body);
  },
);

/** DELETE /users/:user/security/sessions/:token — revoke one session by its public token prefix. */
userScopedRouter.delete(
  '/security/sessions/:token',
  requireMatchingRouteUser,
  (req: Request<{ user: string; token: string }>, res: Response) => {
    const { user, token } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    const currentSessionId = authenticatedSessionId(req) ?? undefined;
    const result = revokeUserSessionByTokenPrefix(user, token, currentSessionId);
    if (!result.ok) {
      const status =
        result.error === 'invalid token'
          ? 400
          : result.error === 'session not found'
            ? 404
            : result.error === 'ambiguous session token'
              ? 409
              : 403;
      return res.status(status).json({ error: result.error });
    }

    const body: SecuritySessionDeleteResponse = { ok: true };
    return res.json(body);
  },
);

userScopedRouter.get(
  '/session',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;
    ensureUserPins([user]);

    const profile = getUserProfile(user);
    const body: UserSessionResponse = {
      username: user,
      admin: isUserAdmin(user),
      displayName: profile.displayName,
      theme: profile.theme,
      email: profile.email ?? '',
      createdAt: accountCreatedAtToApi(profile.createdAt),
      entitlements: entitlementsForUser(user),
    };
    return res.json(body);
  },
);

/** POST /users/:user/password */
userScopedRouter.post(
  '/password',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, UserPasswordChangeRequest>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    const body = req.body ?? {};
    const currentPin = parsePin(body.currentPin);
    const newPin = parsePin(body.newPin);
    if (currentPin == null) {
      return res.status(400).json({ error: 'current password is required' });
    }
    if (newPin == null) {
      return res.status(400).json({ error: 'new password is required' });
    }
    if (currentPin === newPin) {
      return res.status(400).json({ error: 'new password must be different from the current one' });
    }

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;
    ensureUserPins(listUsers());

    if (!isUserPinValid(user, currentPin)) {
      return res.status(401).json({ error: 'current password is incorrect' });
    }

    const updated = updateLoginPin(user, newPin);
    if (!updated) {
      setUserPin(user, newPin);
    }

    return res.json({ ok: true });
  },
);

userScopedRouter.patch(
  '/',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, UsersPatchRequest>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    const body = req.body ?? {};
    const renameRaw = typeof body.username === 'string' ? body.username.trim() : '';
    const wantsRename = renameRaw.length > 0;

    let hasDisplayName = false;
    let displayName: string | null | undefined;
    if ('displayName' in body) {
      hasDisplayName = true;
      if (body.displayName === null) {
        displayName = null;
      } else if (typeof body.displayName === 'string') {
        displayName = body.displayName.trim() || null;
      } else {
        return res.status(400).json({ error: 'displayName must be a string or null' });
      }
    }

    let hasTheme = false;
    let theme: string | null | undefined;
    if ('theme' in body) {
      hasTheme = true;
      const parsed = parseThemePatchInput(body.theme);
      if (parsed === 'invalid') {
        return res.status(400).json({ error: 'invalid theme' });
      }
      theme = parsed;
    }

    let hasEmail = false;
    let email: string | undefined;
    if ('email' in body) {
      hasEmail = true;
      if (body.email === null) {
        return res.status(400).json({ error: 'email is required' });
      }
      if (typeof body.email !== 'string') {
        return res.status(400).json({ error: 'email must be a string' });
      }
      const t = body.email.trim().toLowerCase();
      if (t === '') {
        return res.status(400).json({ error: 'email is required' });
      }
      if (!isPlausibleEmail(t)) {
        return res.status(400).json({ error: 'invalid email' });
      }
      if (isEmailUsedByOtherUser(t, user)) {
        return res.status(409).json({ error: 'email already in use' });
      }
      email = t;
    }

    if (!wantsRename && !hasDisplayName && !hasTheme && !hasEmail) {
      return res.status(400).json({ error: 'no updates provided' });
    }

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;
    ensureUserPins(listUsers());

    if (hasDisplayName || hasTheme || hasEmail) {
      try {
        patchUserProfile(user, {
          ...(hasDisplayName ? { displayName } : {}),
          ...(hasTheme ? { theme } : {}),
          ...(hasEmail ? { email } : {}),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'invalid email') {
          return res.status(400).json({ error: 'invalid email' });
        }
        return res.status(500).json({ error: 'failed to update profile' });
      }
    }

    if (wantsRename) {
      if (!isSafeConfigUserId(renameRaw)) {
        return res.status(400).json({ error: 'invalid user' });
      }
      if (isForbiddenUsername(renameRaw)) {
        return res.status(400).json({ error: 'invalid username' });
      }
      if (renameRaw === user) {
        return res.status(400).json({ error: 'username is unchanged' });
      }

      const out = renameUserConfigFile(user, renameRaw);
      if (!out.ok) {
        const status = out.error.includes('already exists')
          ? 409
          : out.error === 'user not found'
            ? 404
            : 400;
        return res.status(status).json({ error: out.error });
      }

      renameUserPin(user, out.user);
      return res.json({ ok: true, username: out.user });
    }

    return res.json({ ok: true, username: user });
  },
);

userScopedRouter.delete(
  '/',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    try {
      purgeUserData(user);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'purge failed' });
    }

    const out = deleteUserConfigFile(user);
    if (!out.ok) {
      const status = out.error === 'user not found' ? 404 : 400;
      return res.status(status).json({ error: out.error });
    }

    deleteUserPin(out.user);
    return res.json({ ok: true, username: out.user });
  },
);

userScopedRouter.get(
  '/habits/history',
  requireMatchingRouteUser,
  (
    req: Request<
      { user: string },
      unknown,
      unknown,
      { filter?: string; habitId?: string; date?: string }
    >,
    res: Response,
  ) => {
    const { user } = req.params;

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;

    const result = new HabitService().getHabitHistory({
      user,
      config,
      query: req.query,
      at: new Date(),
    });
    res.status(result.status).json(result.body);
  },
);

userScopedRouter.get(
  '/habits',
  requireMatchingRouteUser,
  (
    req: Request<{ user: string }, unknown, unknown, { date?: string; tzOffsetMinutes?: string }>,
    res: Response,
  ) => {
    const { user } = req.params;

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;

    const at = new Date();
    const body = new HabitService().getHabits({ config, query: req.query, at });
    res.json(body);
  },
);

// Backwards compat: old URL used path param for habitId (after explicit `/history`).
userScopedRouter.get(
  '/habits/:habitId',
  requireMatchingRouteUser,
  (req: Request<{ user: string; habitId: string }>, res) => {
    const { user, habitId } = req.params;
    const qs = new URLSearchParams({ filter: habitId });
    res.redirect(307, `/users/${encodeURIComponent(user)}/habits/history?${qs.toString()}`);
  },
);

userScopedRouter.patch(
  '/habits',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, PatchBody>, res: Response) => {
    const { user } = req.params;

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;

    const result = new HabitService().patchHabit({ user, config, body: req.body, at: new Date() });
    return res.status(result.status).json(result.body);
  },
);

userScopedRouter.get(
  '/config',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }
    const text = readUserConfigFileText(user);
    if (text == null) return res.status(404).json({ error: 'user not found' });
    const config = loadUserConfig(user);
    if (!config) return res.status(404).json({ error: 'user not found' });
    const body: UserConfigGetResponse = {
      text,
      ...configResponseParts(user, text),
    };
    res.json(body);
  },
);

userScopedRouter.put(
  '/config',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, Partial<UserConfigPutRequest>>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }
    const requestBody = req.body ?? {};
    let text: string;
    if (typeof requestBody.text === 'string') {
      text = requestBody.text;
    } else if (requestBody.config != null) {
      try {
        text = serializeConfigJson(requestBody.config);
      } catch (e) {
        return res.status(400).json({ error: e instanceof Error ? e.message : 'invalid config' });
      }
    } else {
      return res.status(400).json({ error: 'text or config is required' });
    }
    const migrations =
      req.body?.migrations == null ? null : parseConfigMigrationTuples(req.body.migrations);
    if (migrations == null) {
      if (req.body?.migrations != null) {
        return res.status(400).json({ error: 'migrations must be an array of string tuples' });
      }
    }
    const deletions = req.body?.deletions == null ? null : parseConfigDeletions(req.body.deletions);
    if (deletions == null) {
      if (req.body?.deletions != null) {
        return res.status(400).json({ error: 'deletions must be an array of strings' });
      }
    }
    const previousConfig = loadUserConfig(user);
    if (!previousConfig) return res.status(404).json({ error: 'user not found' });
    const previousText = readUserConfigFileText(user);
    if (previousText == null) return res.status(404).json({ error: 'user not found' });
    const configMigrations = migrations ?? buildConfigMigrations(previousText, text);
    const configDeletions = deletions ?? buildConfigDeletions(previousText, text);

    const out = writeUserConfigFileText(user, text);
    if (!out.ok) {
      return res.status(400).json({ error: out.error });
    }
    if (configMigrations.length > 0) {
      const nextConfig = loadUserConfig(user);
      if (!nextConfig) return res.status(404).json({ error: 'user not found' });
      applyConfigDataMigrations(user, configMigrations, previousConfig.habits, nextConfig.habits);
    }
    if (configDeletions.length > 0) {
      applyConfigDataDeletions(user, configDeletions, previousConfig.habits);
    }
    const body: UserConfigPutResponse = { ok: true, user };
    res.json(body);
  },
);

userScopedRouter.get(
  '/data',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const { user } = req.params;
    const config = loadUserConfigForResponse(user, res);
    if (!config) return;

    res
      .status(200)
      .type('text/csv')
      .set('Content-Disposition', `attachment; filename="${user}-habsum-data.csv"`)
      .send(userDataCsv(user));
  },
);

userScopedRouter.delete(
  '/data',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const { user } = req.params;
    const config = loadUserConfigForResponse(user, res);
    if (!config) return;
    purgeUserData(user);
    const body: PurgeUserDataResponse = { ok: true, user };
    res.json(body);
  },
);
