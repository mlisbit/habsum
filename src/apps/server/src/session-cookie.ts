import type { Response } from 'express';

/** HttpOnly cookie name for server-side logged-in sessions. */
export const SESSION_COOKIE_NAME = 'habsum_sid';

const DEFAULT_SESSION_TTL_SEC = 60 * 60 * 24 * 30;

export function sessionTtlSeconds(): number {
  const raw = process.env.HABSUM_SESSION_TTL_SECONDS;
  if (raw == null || raw.trim() === '') return DEFAULT_SESSION_TTL_SEC;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SESSION_TTL_SEC;
  return Math.floor(n);
}

export function sessionCookieUsesSecureFlag(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.HABSUM_SECURE_COOKIES === '1';
}

function cookieBaseAttrs(): string {
  const attrs = [`Path=/`, `HttpOnly`, `SameSite=Lax`];
  if (sessionCookieUsesSecureFlag()) attrs.push('Secure');
  return attrs.join('; ');
}

/** Parse Cookie header into a map (first occurrence wins). */
export function readCookieJar(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const segment of cookieHeader.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    try {
      if (!(name in out)) out[name] = decodeURIComponent(value);
    } catch {
      if (!(name in out)) out[name] = value;
    }
  }
  return out;
}

export function getSessionCookieValue(cookieHeader: string | undefined): string | undefined {
  const jar = readCookieJar(cookieHeader);
  return jar[SESSION_COOKIE_NAME];
}

export function appendSessionCookie(res: Response, sessionId: string): void {
  const maxAge = sessionTtlSeconds();
  const value = encodeURIComponent(sessionId);
  const line = `${SESSION_COOKIE_NAME}=${value}; Max-Age=${maxAge}; ${cookieBaseAttrs()}`;
  res.append('Set-Cookie', line);
}

export function appendClearSessionCookie(res: Response): void {
  const line = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; ${cookieBaseAttrs()}`;
  res.append('Set-Cookie', line);
}
