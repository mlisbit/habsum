import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getSessionCookieValue } from '../session-cookie.js';
import { getUsernameForSession, isUserAdmin } from '../db.js';

/** Username from session cookie + DB, or null. */
export function authenticatedUsername(req: Request): string | null {
  const sid = getSessionCookieValue(req.headers.cookie);
  if (!sid) return null;
  return getUsernameForSession(sid);
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
