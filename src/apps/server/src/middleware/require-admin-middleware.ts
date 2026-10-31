import type { RequestHandler } from 'express';
import { getOucSessionHeader } from '../utils/cookie-session-utils.js';

/** 401 / 403 unless logged-in admin. */
export const requireAdminMiddleware: RequestHandler = (req, res, next) => {
  if (getOucSessionHeader(req)) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  const session = res.locals.session;
  if (!session) {
    res.status(401).json({ error: 'not authenticated' });
    return;
  }
  if (!session.isAdmin) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  next();
};
