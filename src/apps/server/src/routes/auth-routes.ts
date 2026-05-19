import { Router, type Request, type Response } from 'express';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import type { OucLoginRequest, OucLoginResponse } from '@habsum/types/api-responses/ouc-post';
import type { LogoutResponse } from '@habsum/types/common/misc';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import { listUsers } from '../config.js';
import {
  ensureUserPins,
  getUserProfile,
  isUserForcePasswordReset,
  isOucSessionId,
  revokeUserSession,
  getUsernameForSession,
} from '../db.js';
import { entitlementsForUser } from '../entitlements.js';
import { appendClearSessionCookie, getSessionCookieValue } from '../session-cookie.js';
import { getOucSessionHeader, resolveActiveSessionId } from '../session-request.js';

export const authRouter = Router();

authRouter.get('/auth/me', (req: Request, res: Response) => {
  const sid = resolveActiveSessionId(req);
  const user = sid ? getUsernameForSession(sid) : null;
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
    email: profile.email ?? '',
    createdAt: accountCreatedAtToApi(profile.createdAt),
    entitlements: entitlementsForUser(user),
    forcePasswordReset: isUserForcePasswordReset(user),
    sessionTokenPrefix: sid!.slice(0, 8),
  };
  return res.json(body);
});

/** Validates an operate-under token (client stores it per-window; no shared cookie). */
authRouter.post('/auth/ouc', (req: Request<unknown, unknown, OucLoginRequest>, res: Response) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token || !isOucSessionId(token)) {
    return res.status(400).json({ error: 'invalid token' });
  }

  const user = getUsernameForSession(token);
  if (!user) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }

  const body: OucLoginResponse = { ok: true, user };
  return res.json(body);
});

authRouter.post('/auth/ouc/logout', (req: Request, res: Response) => {
  const token = getOucSessionHeader(req);
  if (token && isOucSessionId(token)) {
    revokeUserSession(token);
  }
  const body: LogoutResponse = { ok: true };
  return res.json(body);
});

authRouter.post('/logout', (req: Request, res: Response) => {
  const sid = getSessionCookieValue(req.headers.cookie);
  if (sid) revokeUserSession(sid);
  appendClearSessionCookie(res);
  const body: LogoutResponse = { ok: true };
  res.json(body);
});
