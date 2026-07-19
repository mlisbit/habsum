import { Router } from 'express';
import { securityController } from './security.controller.js';
import { requireMatchingRouteUser } from '../../middleware/auth.js';

export const securityRouter = Router();

// Used by security settings to display the user's active authenticated sessions.
securityRouter.get(
  '/users/:user/security',
  requireMatchingRouteUser,
  securityController.getSecurity,
);

// Used by security settings to revoke every session except the current one.
securityRouter.delete(
  '/users/:user/security/sessions',
  requireMatchingRouteUser,
  securityController.deleteSecuritySessions,
);

// Used by security settings to revoke one selected authenticated session.
securityRouter.delete(
  '/users/:user/security/sessions/:token',
  requireMatchingRouteUser,
  securityController.deleteSecuritySession,
);

// Used by password settings to change the authenticated user's password.
securityRouter.post(
  '/users/:user/password',
  requireMatchingRouteUser,
  securityController.postPassword,
);
