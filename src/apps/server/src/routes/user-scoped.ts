// Express routes for user-scoped API endpoints; habit and config routes delegate to services.
import { Router, type Request, type Response } from 'express';
import type { LoginUserRequest } from '@habsum/types/common/misc';
import type { UserPasswordChangeRequest } from '@habsum/types/api-responses/user-password-change';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import { type PatchBody } from '../services/habit-service.utils.js';
import { AuthService } from '../services/auth-service.js';
import { buildUserDataCsv } from '../services/data-export-service.js';
import { HabitService } from '../services/habit-service.js';
import { UserService } from '../services/user-service.js';
import { authenticatedSessionId, requireMatchingRouteUser } from '../middleware/auth.js';
import { appendSessionCookie } from '../utils/cookie-session-utils.js';
import type { UserConfig } from '../types/userConfig.js';

const authService = new AuthService();
const userService = new UserService();

function loadUserConfigForRoute(user: string, res: Response): UserConfig | null {
  const result = userService.loadUserConfig(user);
  if (!result.ok) {
    res.status(result.status).json(result.body);
    return null;
  }
  return result.config;
}

export const userScopedRouter = Router({ mergeParams: true });

/** POST /users/:user/login */
userScopedRouter.post(
  '/login',
  (req: Request<{ user: string }, unknown, LoginUserRequest>, res: Response) => {
    const result = authService.login(req.params.user, req.body);
    if (result.sessionId) appendSessionCookie(res, result.sessionId);
    return res.status(result.status).json(result.body);
  },
);

/** GET /users/:user/security */
userScopedRouter.get(
  '/security',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const result = userService.getSecuritySessions(
      req.params.user,
      authenticatedSessionId(req) ?? undefined,
    );
    return res.status(result.status).json(result.body);
  },
);

/** DELETE /users/:user/security/sessions — revoke every session except the current cookie. */
userScopedRouter.delete(
  '/security/sessions',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const result = userService.deleteOtherSecuritySessions(
      req.params.user,
      authenticatedSessionId(req),
    );
    return res.status(result.status).json(result.body);
  },
);

/** DELETE /users/:user/security/sessions/:token — revoke one session by its public token prefix. */
userScopedRouter.delete(
  '/security/sessions/:token',
  requireMatchingRouteUser,
  (req: Request<{ user: string; token: string }>, res: Response) => {
    const { user, token } = req.params;
    const result = userService.deleteSecuritySession(
      user,
      token,
      authenticatedSessionId(req) ?? undefined,
    );
    return res.status(result.status).json(result.body);
  },
);

userScopedRouter.get(
  '/session',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const result = userService.getSession(req.params.user);
    return res.status(result.status).json(result.body);
  },
);

/** POST /users/:user/password */
userScopedRouter.post(
  '/password',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, UserPasswordChangeRequest>, res: Response) => {
    const result = userService.changePassword(req.params.user, req.body);
    return res.status(result.status).json(result.body);
  },
);

userScopedRouter.patch(
  '/',
  requireMatchingRouteUser,
  (req: Request<{ user: string }, unknown, UsersPatchRequest>, res: Response) => {
    const result = userService.patchUser(req.params.user, req.body);
    return res.status(result.status).json(result.body);
  },
);

userScopedRouter.delete(
  '/',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const result = userService.deleteUser(req.params.user);
    return res.status(result.status).json(result.body);
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

    const config = loadUserConfigForRoute(user, res);
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

    const config = loadUserConfigForRoute(user, res);
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

    const config = loadUserConfigForRoute(user, res);
    if (!config) return;

    const result = new HabitService().patchHabit({ user, config, body: req.body, at: new Date() });
    return res.status(result.status).json(result.body);
  },
);

userScopedRouter.get(
  '/config',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const result = userService.getUserConfig(req.params.user);
    res.status(result.status).json(result.body);
  },
);

userScopedRouter.put(
  '/config',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const result = userService.putUserConfig(req.params.user, req.body);
    res.status(result.status).json(result.body);
  },
);

userScopedRouter.get(
  '/data',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const { user } = req.params;
    const config = loadUserConfigForRoute(user, res);
    if (!config) return;

    res
      .status(200)
      .type('text/csv')
      .set('Content-Disposition', `attachment; filename="${user}-habsum-data.csv"`)
      .send(buildUserDataCsv(user));
  },
);

userScopedRouter.delete(
  '/data',
  requireMatchingRouteUser,
  (req: Request<{ user: string }>, res: Response) => {
    const result = userService.deleteUserData(req.params.user);
    res.status(result.status).json(result.body);
  },
);
