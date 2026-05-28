import { Router, type Request, type Response } from 'express';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from '@habsum/types/api-responses/forgot-password-post';
import type { ResetPasswordValidateResponse } from '@habsum/types/api-responses/reset-password-get';
import type {
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '@habsum/types/api-responses/reset-password-post';
import type { OucLoginRequest, OucLoginResponse } from '@habsum/types/api-responses/ouc-post';
import type { LogoutResponse } from '@habsum/types/common/misc';
import { isPlausibleEmail, parsePin } from '../request-helpers.js';
import { accountCreatedAtToApi } from '@habsum/types/common/day';
import { listUsers } from '../config.js';
import {
  ensureUserPins,
  getUserProfile,
  isOucSessionId,
  revokeUserSession,
  getUsernameForSession,
  resolveUsernameByLoginId,
  passwordResetRetryAfterSeconds,
  recordPasswordResetRequest,
  createUserSession,
} from '../db.js';
import { entitlementsForUser } from '../entitlements.js';
import { sendPasswordResetEmail } from '../password-reset-email.js';
import { isDevelopment } from '../env.js';
import {
  issuePasswordResetToken,
  lookupValidPasswordResetToken,
  consumePasswordResetToken,
} from '../password-reset-token.js';
import { isNewLoginPasswordAllowed, resetLoginPassword } from '../reset-login-password.js';
import {
  appendClearSessionCookie,
  appendSessionCookie,
  getSessionCookieValue,
  sessionTtlSeconds,
} from '../session-cookie.js';
import { getOucSessionHeader, resolveActiveSessionId } from '../session-request.js';

export const authRouter = Router();

authRouter.get('/auth/me', (req: Request, res: Response) => {
  const sid = resolveActiveSessionId(req);
  const user = sid ? getUsernameForSession(sid) : null;
  if (!user) {
    const body: MeGetResponse = {
      username: null,
      displayName: null,
      theme: null,
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
    sessionTokenPrefix: sid!.slice(0, 8),
  };
  return res.json(body);
});

/** Validates an operate-under token (client stores it per-window; no shared cookie). */
authRouter.post(
  '/auth/forgot-password',
  async (req: Request<unknown, unknown, ForgotPasswordRequest>, res: Response) => {
    const rawEmail = req.body?.email;
    if (typeof rawEmail !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    const email = rawEmail.trim().toLowerCase();
    if (!isPlausibleEmail(email)) {
      return res.status(400).json({ error: 'invalid email' });
    }

    const username = resolveUsernameByLoginId(email);
    if (!username && isDevelopment()) {
      console.log(`[habsum] forgot-password: no account for ${email} (generic success returned)`);
    }
    if (username) {
      const retryAfterSeconds = passwordResetRetryAfterSeconds(username);
      if (retryAfterSeconds > 0) {
        const body: ForgotPasswordResponse = {
          ok: true,
          message: 'please wait a little while longer',
          timeout: retryAfterSeconds,
        };
        return res.json(body);
      }

      const { token, id: tokenId } = issuePasswordResetToken(username, 'reset');
      try {
        await sendPasswordResetEmail(username, email, token);
        recordPasswordResetRequest(username);
      } catch (e) {
        consumePasswordResetToken(tokenId);
        console.error('[habsum] failed to send password reset email', e);
        return res.status(503).json({ error: 'Something went wrong with your request' });
      }
    }

    const body: ForgotPasswordResponse = {
      ok: true,
      message: 'If an account exists for that email, reset instructions will be sent shortly.',
    };
    return res.json(body);
  },
);

authRouter.get('/auth/reset-password', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  const row = lookupValidPasswordResetToken(token);
  if (!row) {
    return res.status(400).json({ error: 'invalid or expired reset link' });
  }

  const body: ResetPasswordValidateResponse = {
    ok: true,
    purpose: row.purpose,
    ...(row.purpose === 'invite' ? { displayName: getUserProfile(row.userId).displayName } : {}),
  };
  return res.json(body);
});

authRouter.post(
  '/auth/reset-password',
  (req: Request<unknown, unknown, ResetPasswordRequest>, res: Response) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const newPin = parsePin(req.body?.newPin);
    if (newPin == null) {
      return res.status(400).json({ error: 'new password is required' });
    }

    const row = lookupValidPasswordResetToken(token);
    if (!row) {
      return res.status(400).json({ error: 'invalid or expired reset link' });
    }

    if (!isNewLoginPasswordAllowed(row.userId, newPin)) {
      return res.status(400).json({ error: 'new password must be different from the current one' });
    }

    if (!consumePasswordResetToken(row.id)) {
      return res.status(400).json({ error: 'invalid or expired reset link' });
    }

    resetLoginPassword(row.userId, newPin);

    if (row.purpose === 'invite') {
      ensureUserPins([row.userId]);
      const sessionId = createUserSession(row.userId, sessionTtlSeconds());
      appendSessionCookie(res, sessionId);
      const body: ResetPasswordResponse = { ok: true, user: row.userId };
      return res.json(body);
    }

    const body: ResetPasswordResponse = { ok: true };
    return res.json(body);
  },
);

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
