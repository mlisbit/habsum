import { Router, type Request, type Response } from 'express';
import type { ForgotPasswordRequest } from '@habsum/types/api-responses/forgot-password-post';
import type { ResetPasswordRequest } from '@habsum/types/api-responses/reset-password-post';
import type { OucLoginRequest } from '@habsum/types/api-responses/ouc-post';
import { AuthService } from '../services/auth-service.js';
import {
  appendClearSessionCookie,
  appendSessionCookie,
  getSessionCookieValue,
  getOucSessionHeader,
  resolveActiveSessionId,
} from '../utils/cookie-session-utils.js';

export const authRouter = Router();

const WEB_VERSION_HEADER = 'x-habsum-web-version';
const authService = new AuthService();

authRouter.get('/auth/me', (req: Request, res: Response) => {
  const result = authService.getMe(resolveActiveSessionId(req), req.headers[WEB_VERSION_HEADER]);
  return res.status(result.status).json(result.body);
});

authRouter.post(
  '/auth/forgot-password',
  async (req: Request<unknown, unknown, ForgotPasswordRequest>, res: Response) => {
    const result = await authService.forgotPassword(req.body);
    return res.status(result.status).json(result.body);
  },
);

authRouter.get('/auth/reset-password', (req: Request, res: Response) => {
  const result = authService.validateResetPassword(req.query.token);
  return res.status(result.status).json(result.body);
});

authRouter.post(
  '/auth/reset-password',
  (req: Request<unknown, unknown, ResetPasswordRequest>, res: Response) => {
    const result = authService.resetPassword(req.body);
    if (result.sessionId) appendSessionCookie(res, result.sessionId);
    return res.status(result.status).json(result.body);
  },
);

/** Validates an operate-under token (client stores it per-window; no shared cookie). */
authRouter.post('/auth/ouc', (req: Request<unknown, unknown, OucLoginRequest>, res: Response) => {
  const result = authService.loginWithOuc(req.body);
  return res.status(result.status).json(result.body);
});

authRouter.post('/auth/ouc/logout', (req: Request, res: Response) => {
  const result = authService.logoutOuc(getOucSessionHeader(req) ?? null);
  return res.status(result.status).json(result.body);
});

authRouter.post('/logout', (req: Request, res: Response) => {
  const result = authService.logout(getSessionCookieValue(req.headers.cookie) ?? null);
  appendClearSessionCookie(res);
  return res.status(result.status).json(result.body);
});
