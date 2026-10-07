import type { ForgotPasswordRequest } from '@habsum/types/api-responses/forgot-password-post';
import type { OucLoginRequest } from '@habsum/types/api-responses/ouc-post';
import type { ResetPasswordRequest } from '@habsum/types/api-responses/reset-password-post';
import type { SignupRequest } from '@habsum/types/api-responses/signup-post';
import type { InitialUserPostRequest } from '@habsum/types/api-responses/initial-user-post';
import type { LoginUserRequest } from '@habsum/types/common/misc';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth-service.js';
import {
  sendAsyncServiceResult,
  sendServiceError,
  sendServiceResult,
} from '../utils/controller-result-utils.js';
import {
  appendClearSessionCookie,
  appendSessionCookie,
  getOucSessionHeader,
  getSessionCookieValue,
} from '../utils/cookie-session-utils.js';

const authService = new AuthService();

export const authController = {
  getStatus(_req: Request, res: Response) {
    return sendServiceResult(res, () => authService.getStatus());
  },

  postInitialUser(req: Request<unknown, unknown, InitialUserPostRequest>, res: Response) {
    try {
      const result = authService.createInitialUser(req.body);
      appendSessionCookie(res, result.sessionId);
      return res.status(201).json(result.data);
    } catch (error) {
      return sendServiceError(error, res);
    }
  },

  postSignup(req: Request<unknown, unknown, SignupRequest>, res: Response) {
    try {
      const result = authService.signup(req.body);
      appendSessionCookie(res, result.sessionId);
      return res.status(201).json(result.data);
    } catch (error) {
      return sendServiceError(error, res);
    }
  },

  postLogin(req: Request<unknown, unknown, LoginUserRequest>, res: Response) {
    try {
      const result = authService.login(req.body?.user ?? '', req.body);
      appendSessionCookie(res, result.sessionId);
      return res.json(result.data);
    } catch (error) {
      return sendServiceError(error, res);
    }
  },

  async postForgotPassword(req: Request<unknown, unknown, ForgotPasswordRequest>, res: Response) {
    return sendAsyncServiceResult(res, () => authService.forgotPassword(req.body));
  },

  getResetPassword(req: Request, res: Response) {
    return sendServiceResult(res, () => authService.validateResetPassword(req.query.token));
  },

  postResetPassword(req: Request<unknown, unknown, ResetPasswordRequest>, res: Response) {
    try {
      const result = authService.resetPassword(req.body);
      if (result.sessionId) appendSessionCookie(res, result.sessionId);
      return res.json(result.data);
    } catch (error) {
      return sendServiceError(error, res);
    }
  },

  postOuc(req: Request<unknown, unknown, OucLoginRequest>, res: Response) {
    return sendServiceResult(res, () => authService.loginWithOuc(req.body));
  },

  postOucLogout(req: Request, res: Response) {
    authService.logoutOuc(getOucSessionHeader(req) ?? null);
    return res.json({ ok: true });
  },

  postLogout(req: Request, res: Response) {
    authService.logout(getSessionCookieValue(req.headers.cookie) ?? null);
    appendClearSessionCookie(res);
    return res.json({ ok: true });
  },
};
