import { Router } from 'express';
import { securityController } from './security.controller.js';
import { restrictForDemoMiddleware } from '../../middleware/restrict-for-demo-middleware.js';

export const securityRouter = Router({ mergeParams: true });

// Used by security settings to display the user's active authenticated sessions.
securityRouter.get('/security', securityController.getSecurity);

// Used by security settings to revoke every session except the current one.
securityRouter.delete(
  '/security/sessions',
  restrictForDemoMiddleware(),
  securityController.deleteSecuritySessions,
);

// Used by security settings to revoke one selected authenticated session.
securityRouter.delete(
  '/security/sessions/:token',
  restrictForDemoMiddleware(),
  securityController.deleteSecuritySession,
);

// Used by password settings to change the authenticated user's password.
securityRouter.post('/password', restrictForDemoMiddleware(), securityController.postPassword);
