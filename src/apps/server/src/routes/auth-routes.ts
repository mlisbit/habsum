import { Router, type Request, type Response } from 'express';
import type { AuthMeResponse, LogoutResponse } from '@habsum/types/common/misc';
import { listUsers } from '../config.js';
import { ensureUserPins, getUserProfile, revokeUserSession } from '../db.js';
import { appendClearSessionCookie, getSessionCookieValue } from '../session-cookie.js';
import { authenticatedUsername } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = authenticatedUsername(req);
  if (!user) {
    const body: AuthMeResponse = { user: null, displayName: null, theme: 'dark', email: null };
    return res.json(body);
  }
  ensureUserPins(listUsers());
  const profile = getUserProfile(user);
  const body: AuthMeResponse = {
    user,
    displayName: profile.displayName,
    theme: profile.theme,
    email: profile.email,
  };
  return res.json(body);
});

authRouter.post('/logout', (req: Request, res: Response) => {
  const sid = getSessionCookieValue(req.headers.cookie);
  if (sid) revokeUserSession(sid);
  appendClearSessionCookie(res);
  const body: LogoutResponse = { ok: true };
  res.json(body);
});
