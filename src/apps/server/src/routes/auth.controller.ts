import type { ForgotPasswordRequest } from '@habsum/types/api-responses/forgot-password-post';
import type { OucLoginRequest } from '@habsum/types/api-responses/ouc-post';
import type { ResetPasswordRequest } from '@habsum/types/api-responses/reset-password-post';
import type { LoginUserRequest } from '@habsum/types/common/misc';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth-service.js';
import {
  appendClearSessionCookie,
  appendSessionCookie,
  getOucSessionHeader,
  getSessionCookieValue,
} from '../utils/cookie-session-utils.js';

const authService = new AuthService();

export const authController = {
  postLogin(req: Request<unknown, unknown, LoginUserRequest>, res: Response) {
    const result = authService.login(req.body?.user ?? '', req.body);
    if (result.sessionId) appendSessionCookie(res, result.sessionId);
    return res.status(result.status).json(result.body);
  },

  async postForgotPassword(req: Request<unknown, unknown, ForgotPasswordRequest>, res: Response) {
    const result = await authService.forgotPassword(req.body);
    return res.status(result.status).json(result.body);
  },

  getResetPassword(req: Request, res: Response) {
    const result = authService.validateResetPassword(req.query.token);
    return res.status(result.status).json(result.body);
  },

  postResetPassword(req: Request<unknown, unknown, ResetPasswordRequest>, res: Response) {
    const result = authService.resetPassword(req.body);
    if (result.sessionId) appendSessionCookie(res, result.sessionId);
    return res.status(result.status).json(result.body);
  },

  postOuc(req: Request<unknown, unknown, OucLoginRequest>, res: Response) {
    const result = authService.loginWithOuc(req.body);
    return res.status(result.status).json(result.body);
  },

  postOucLogout(req: Request, res: Response) {
    const result = authService.logoutOuc(getOucSessionHeader(req) ?? null);
    return res.status(result.status).json(result.body);
  },

  postLogout(req: Request, res: Response) {
    const result = authService.logout(getSessionCookieValue(req.headers.cookie) ?? null);
    appendClearSessionCookie(res);
    return res.status(result.status).json(result.body);
  },
};
