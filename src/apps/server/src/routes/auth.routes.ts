import { Router } from 'express';
import { authController } from './auth.controller.js';

export const authRouter = Router();

// Used once by a fresh installation to create its first administrator account.
authRouter.post('/auth/initial-user', authController.postInitialUser);

// Used by the public signup page when account creation is enabled.
authRouter.post('/auth/signup', authController.postSignup);

// Used by the login page to authenticate a user and establish their session cookie.
authRouter.post('/auth/login', authController.postLogin);

// Used by the forgot-password page to request a recovery email without revealing accounts.
authRouter.post('/auth/forgot-password', authController.postForgotPassword);

// Used by the reset-password page to validate a recovery or invitation token before submission.
authRouter.get('/auth/reset-password', authController.getResetPassword);

// Used by the reset-password page to set a new password and start a session.
authRouter.post('/auth/reset-password', authController.postResetPassword);

// Used by the operate-under popup to validate its window-scoped administrator token.
authRouter.post('/auth/ouc', authController.postOuc);

// Used by the operate-under indicator to revoke the current impersonation session.
authRouter.post('/auth/ouc/logout', authController.postOucLogout);

// Used by login and authenticated pages to clear the current user session.
authRouter.post('/auth/logout', authController.postLogout);
