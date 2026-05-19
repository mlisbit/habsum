import { Router, type Request, type Response } from 'express';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import type { LogoutResponse } from '@habsum/types/common/misc';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import { listUsers } from '../config.js';
import { ensureUserPins, getUserProfile, revokeUserSession } from '../db.js';
import { entitlementsForUser } from '../entitlements.js';
import { appendClearSessionCookie, getSessionCookieValue } from '../session-cookie.js';
import { authenticatedUsername } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = authenticatedUsername(req);
  if (!user) {
    const body: MeGetResponse = {
      username: null,
      displayName: null,
      theme: 'dark',
      email: null,
      createdAt: null,
      entitlements: [],
    };
    return res.json(body);
  }
  ensureUserPins(listUsers());
  const profile = getUserProfile(user);
  const body: MeGetResponse = {
    username: user,
    displayName: profile.displayName,
    theme: profile.theme,
    email: profile.email,
    createdAt: accountCreatedAtToApi(profile.createdAt),
    entitlements: entitlementsForUser(user),
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
