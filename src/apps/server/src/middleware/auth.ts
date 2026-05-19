import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getUsernameForSession, isUserAdmin, isUserForcePasswordReset } from '../db.js';
import { getOucSessionHeader, resolveActiveSessionId } from '../session-request.js';

/** Username from operate-under header or session cookie + DB, or null. */
export function authenticatedUsername(req: Request): string | null {
  const sid = resolveActiveSessionId(req);
  if (!sid) return null;
  return getUsernameForSession(sid);
}

/** Session id for the current request (header or cookie). */
export function authenticatedSessionId(req: Request): string | null {
  return resolveActiveSessionId(req);
}

/** 401 unless logged in; sets `res.locals.sessionUser`. */
export const requireAuthenticated: RequestHandler = (req, res, next) => {
  const u = authenticatedUsername(req);
  if (!u) {
    res.status(401).json({ error: 'not authenticated' });
    return;
  }
  res.locals.sessionUser = u;
  next();
};

/** 401 / 403 unless logged-in admin; sets `res.locals.sessionUser`. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (getOucSessionHeader(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const u = authenticatedUsername(req);
  if (!u) {
    res.status(401).json({ error: 'not authenticated' });
    return;
  }
  if (!isUserAdmin(u)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  res.locals.sessionUser = u;
  next();
};

/**
 * Requires `req.params.user` to match session user (parent route must define `:user`;
 * use `Router({ mergeParams: true })` on the mounted router).
 */
export const requireMatchingRouteUser: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const u = authenticatedUsername(req);
  if (!u) {
    res.status(401).json({ error: 'not authenticated' });
    return;
  }
  const routeUser = req.params.user;
  if (routeUser !== u) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  res.locals.sessionUser = u;
  next();
};

/**
 * When `force_password_reset` is set, block authenticated app routes until
 * `POST /users/:user/new-password` completes. Mount after `/login`; exempt that path and
 * `POST /new-password`.
 */
export const rejectIfForcePasswordReset: RequestHandler = (req, res, next) => {
  if (req.method === 'POST' && req.path === '/new-password') {
    next();
    return;
  }
  const u = authenticatedUsername(req);
  const routeUser = req.params.user;
  if (u && routeUser === u && isUserForcePasswordReset(u)) {
    res.status(403).json({ error: 'password reset required' });
    return;
  }
  next();
};
