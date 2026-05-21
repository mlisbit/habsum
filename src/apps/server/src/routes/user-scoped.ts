import { Router, type Request, type Response } from 'express';
import type { Habit } from '@habsum/types/common/habit';
import type {
  LoginUserRequest,
  LoginUserResponse,
  PurgeUserDataResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
  UserSessionResponse,
} from '@habsum/types/common/misc';
import type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
import type { HistoryGetResponse } from '@habsum/types/api-responses/history-get';
import type { UserPasswordChangeRequest } from '@habsum/types/api-responses/user-password-change';
import type { UserNewPasswordRequest } from '@habsum/types/api-responses/user-new-password';
import type { SecurityGetResponse } from '@habsum/types/api-responses/security-get';
import type {
  SecuritySessionDeleteResponse,
  SecuritySessionsDeleteOthersResponse,
} from '@habsum/types/api-responses/security-delete';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import { dasherize } from '@habsum/utils';
import { isForbiddenUsername } from '../forbidden-usernames.js';
import {
  deleteUserConfigFile,
  listUsers,
  readUserConfigFileText,
  renameUserConfigFile,
  writeUserConfigFileText,
  type HabitDef,
} from '../config.js';
import {
  addToTotal,
  createUserSession,
  listSessionsForUsername,
  revokeOtherUserSessions,
  revokeUserSessionByTokenPrefix,
  deleteDailySelect,
  deleteSummationEvent,
  deleteSummationEventsForDay,
  deleteUserPin,
  clearUserForcePasswordReset,
  completeForcedPasswordReset,
  ensureUserPins,
  isEmailUsedByOtherUser,
  resolveUsernameByLoginId,
  getFirstDate,
  getHabitFirstDate,
  getSelect,
  getSummationEvents,
  getSummationDayTotal,
  getUserProfile,
  isUserAdmin,
  isUserForcePasswordReset,
  isUserPinValid,
  patchUserProfile,
  purgeUserData,
  renameUserPin,
  setSelect,
  setTotal,
  setUserPin,
  updateLoginPin,
} from '../db.js';
import {
  emptyHabitForHistory,
  habitHistoryForConfiguredPeriod,
  habitHistoryIfConfigured,
  habitRowsForHistory,
  minDate,
  parseHabitFilter,
  type PatchBody,
  streakGraphForConfiguredWindow,
} from '../habit-presentation.js';
import {
  authenticatedSessionId,
  rejectIfForcePasswordReset,
  requireMatchingRouteUser,
} from '../middleware/auth.js';
import {
  isAllowedUiTheme,
  isPlausibleEmail,
  isSafeConfigUserId,
  isSafeLoginId,
  loadUserConfigForResponse,
  parsePin,
} from '../request-helpers.js';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import { entitlementsForUser } from '../entitlements.js';
import { appendSessionCookie, sessionTtlSeconds } from '../session-cookie.js';
import { mapSummationEventsToApi } from '../summation-event-api.js';
import { parseClientCreatedAtIso, resolveHabitApiDateQuery } from '../server-time.js';

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
      forcePasswordReset: isUserForcePasswordReset(user),
    };
    return res.json(body);
  },
);

userScopedRouter.use(rejectIfForcePasswordReset);

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

/** POST /users/:user/new-password — required reset flow when `force_password_reset` is set. */
userScopedRouter.post(
  '/new-password',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, UserNewPasswordRequest>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;
    ensureUserPins(listUsers());

    if (!isUserForcePasswordReset(user)) {
      return res.status(403).json({ error: 'password reset is not required' });
    }

    const newPin = parsePin(req.body?.newPin);
    if (newPin == null) {
      return res.status(400).json({ error: 'new password is required' });
    }

    if (isUserPinValid(user, newPin)) {
      return res.status(400).json({ error: 'new password must be different from the current one' });
    }

    let updated = completeForcedPasswordReset(user, newPin);
    if (!updated) {
      setUserPin(user, newPin);
      clearUserForcePasswordReset(user);
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
    let theme: string | undefined;
    if ('theme' in body) {
      hasTheme = true;
      if (typeof body.theme !== 'string') {
        return res.status(400).json({ error: 'theme must be a string' });
      }
      const t = body.theme.trim();
      if (!isAllowedUiTheme(t)) {
        return res.status(400).json({ error: 'invalid theme' });
      }
      theme = t;
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

    const habitIds = parseHabitFilter(req.query.filter ?? req.query.habitId);
    if (habitIds.length === 0) return res.status(400).json({ error: 'filter is required' });

    const at = new Date();
    const inspectDate = resolveHabitApiDateQuery(req.query.date, at);

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;

    const habitDefs: HabitDef[] = [];
    for (const habitId of habitIds) {
      const habitDef = config.habits.find((h) => dasherize(h.name) === habitId);
      if (!habitDef) {
        return res.status(404).json({ error: `habit not configured: ${habitId}` });
      }
      habitDefs.push(habitDef);
    }

    const habitsByDate = new Map<string, Habit[]>();
    for (const habitDef of habitDefs) {
      for (const { day, habit } of habitRowsForHistory(user, habitDef)) {
        habitsByDate.set(day, [...(habitsByDate.get(day) ?? []), habit]);
      }
    }

    for (const [day, habits] of habitsByDate) {
      const habitsForDay = new Map(habits.map((habit) => [habit.name, habit]));
      habitsByDate.set(
        day,
        habitDefs.map(
          (habitDef) => habitsForDay.get(habitDef.name) ?? emptyHabitForHistory(habitDef),
        ),
      );
    }

    const inspectDayHabits = habitsByDate.get(inspectDate);
    const inspectMap = inspectDayHabits ? new Map(inspectDayHabits.map((h) => [h.name, h])) : null;
    const data: Habit[] = habitDefs.map(
      (habitDef) => inspectMap?.get(habitDef.name) ?? emptyHabitForHistory(habitDef),
    );

    const body: HistoryGetResponse = {
      user,
      habits: Object.fromEntries(
        config.habits.map((habitDef) => [dasherize(habitDef.name), habitDef.name]),
      ),
      firstDate: minDate(habitDefs.map((habitDef) => getHabitFirstDate(user, habitDef.name))),
      data,
      history: {
        user: Array.from(habitsByDate.entries())
          .map(([day, habits]) => ({ day, habits }))
          .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)),
      },
      serverTime: at.toISOString(),
    };
    res.json(body);
  },
);

userScopedRouter.get(
  '/habits',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, unknown, { date?: string }>, res: Response) => {
    const { user } = req.params;

    const config = loadUserConfigForResponse(user, res);
    if (!config) return;

    const firstDate = getFirstDate(user);
    const at = new Date();
    const date = resolveHabitApiDateQuery(req.query.date, at);

    const habits = config.habits.map((h) => {
      if (h.type === 'single_select') {
        return {
          name: h.name,
          goal: h.goal,
          type: 'single_select' as const,
          options: h.options ?? [],
          value: getSelect(user, h.name, date),
          ...(h.streak
            ? {
                streak: streakGraphForConfiguredWindow(user, h.name, date, h.streak.options),
              }
            : {}),
        } satisfies Habit;
      }
      const base = {
        name: h.name,
        goal: h.goal,
        ...(h.history
          ? {
              history: habitHistoryForConfiguredPeriod(
                user,
                h.name,
                date,
                firstDate,
                h.history.period,
              ),
            }
          : {}),
      };
      return {
        ...base,
        type: 'summation' as const,
        total: getSummationDayTotal(user, h.name, date),
        ...(h.summationOptions ? { summationOptions: h.summationOptions } : {}),
      } satisfies Habit;
    });
    const body: HabitsResponse = {
      user,
      date,
      firstDate,
      habits,
      serverTime: at.toISOString(),
    };
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

    const body = req.body ?? {};
    const date =
      typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
    if (date == null) {
      return res.status(400).json({
        error: 'body.date is required (YYYY-MM-DD)',
      });
    }

    const { habit, total, action, value, clientCreatedAt } = body;
    if (typeof habit !== 'string' || habit.length === 0) {
      return res.status(400).json({ error: 'habit is required' });
    }

    const known = config.habits.find((h) => h.name === habit);
    if (!known) {
      return res.status(404).json({ error: `habit "${habit}" not configured` });
    }

    if (known.type === 'single_select') {
      const mode = typeof action === 'string' ? action : undefined;
      if (mode === 'clear') {
        deleteDailySelect(user, habit, date);
        const opts = known.options ?? [];
        const out: PatchHabitResponse = {
          user,
          date,
          habit,
          value: null,
          type: known.type,
          options: opts,
          ...(known.streak
            ? { streak: streakGraphForConfiguredWindow(user, habit, date, known.streak.options) }
            : {}),
        };
        return res.json(out);
      }

      if (typeof value !== 'string' || value.length === 0) {
        return res.status(400).json({ error: 'value is required' });
      }
      const opts = known.options ?? [];
      if (opts.length && !opts.includes(value)) {
        return res.status(400).json({ error: 'invalid option' });
      }
      const next = setSelect(user, habit, date, value);
      const out: PatchHabitResponse = {
        user,
        date,
        habit,
        value: next,
        type: known.type,
        options: opts,
        ...(known.streak
          ? { streak: streakGraphForConfiguredWindow(user, habit, date, known.streak.options) }
          : {}),
      };
      return res.json(out);
    }

    const mode = typeof action === 'string' ? action : 'add';
    const firstDate = getFirstDate(user);
    const historyFields = habitHistoryIfConfigured(user, known, date, firstDate);

    if (mode === 'delete_event') {
      const rawId = body.eventId;
      const eventId = typeof rawId === 'number' ? rawId : Number(rawId);
      if (!Number.isInteger(eventId) || eventId <= 0) {
        return res.status(400).json({ error: 'eventId is required (positive integer)' });
      }
      const removed = deleteSummationEvent(user, habit, date, eventId);
      if (!removed) {
        return res.status(404).json({ error: 'summation event not found' });
      }
      const events = getSummationEvents(user, habit, date);
      const out: PatchHabitResponse = {
        user,
        date,
        habit,
        total: getSummationDayTotal(user, habit, date),
        events: mapSummationEventsToApi(events),
        type: known.type,
        goal: known.goal,
        ...historyFields,
      };
      return res.json(out);
    }

    if (mode === 'clear') {
      deleteSummationEventsForDay(user, habit, date);
      const out: PatchHabitResponse = {
        user,
        date,
        habit,
        total: null,
        events: [],
        type: known.type,
        goal: known.goal,
        ...historyFields,
      };
      return res.json(out);
    }

    const numericTotal = Number(total);
    if (!Number.isFinite(numericTotal)) {
      return res.status(400).json({ error: 'total must be a number' });
    }

    const createdAtSql = parseClientCreatedAtIso(clientCreatedAt);
    if (createdAtSql == null) {
      return res.status(400).json({
        error:
          'body.clientCreatedAt is required for summation add/set (YYYY-MM-DD HH:MM:SS client wall clock)',
      });
    }

    let next: number | null;
    let events = getSummationEvents(user, habit, date);
    if (mode === 'add') {
      const result = addToTotal(user, habit, date, numericTotal, createdAtSql);
      next = result.total;
      events = result.event ? [...events, result.event] : events;
    } else if (mode === 'set') {
      next = setTotal(user, habit, date, numericTotal, createdAtSql);
      events = getSummationEvents(user, habit, date);
    } else {
      return res.status(400).json({ error: `unknown action "${mode}"` });
    }

    const out: PatchHabitResponse = {
      user,
      date,
      habit,
      total: next,
      events: mapSummationEventsToApi(events),
      type: known.type,
      goal: known.goal,
      ...historyFields,
    };
    return res.json(out);
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
    const body: UserConfigGetResponse = { text };
    res.json(body);
  },
);

userScopedRouter.put(
  '/config',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, { text?: unknown }>, res: Response) => {
    const { user } = req.params;
    if (!isSafeConfigUserId(user)) {
      return res.status(400).json({ error: 'invalid user' });
    }
    const { text } = req.body ?? {};
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const out = writeUserConfigFileText(user, text);
    if (!out.ok) {
      return res.status(400).json({ error: out.error });
    }
    const body: UserConfigPutResponse = { ok: true, user };
    res.json(body);
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
