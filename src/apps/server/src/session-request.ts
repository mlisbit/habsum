import type { Request } from 'express';
import { getUsernameForSession, isOucSessionId } from './db.js';
import { getSessionCookieValue } from './session-cookie.js';

export const OUC_SESSION_HEADER = 'x-habsum-ouc-session';

export function getOucSessionHeader(req: Request): string | undefined {
  const raw = req.headers[OUC_SESSION_HEADER];
  if (typeof raw !== 'string') return undefined;
  const token = raw.trim();
  return token || undefined;
}

/** Active session id: operate-under header wins over the HttpOnly cookie when valid. */
export function resolveActiveSessionId(req: Request): string | null {
  const ouc = getOucSessionHeader(req);
  if (ouc && isOucSessionId(ouc) && getUsernameForSession(ouc)) {
    return ouc;
  }

  const sid = getSessionCookieValue(req.headers.cookie);
  if (sid && getUsernameForSession(sid)) {
    return sid;
  }

  return null;
}
