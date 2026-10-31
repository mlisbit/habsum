import { Router } from 'express';
import { usersController } from './users.controller.js';
import { requireAdminMiddleware } from '../middleware/require-admin-middleware.js';

export const usersRouter = Router();

// Used by the global user context to resolve the active user's profile, role, and permissions.
usersRouter.get('/users/me', usersController.getMe);

// Used by the administrator page to list users and their account metadata.
usersRouter.get('/users', requireAdminMiddleware, usersController.getUsers);

// Used by administrators to set or clear an account's demo flag when demo mode is enabled.
usersRouter.put('/users/demo-account', requireAdminMiddleware, usersController.putUserDemoAccount);

// Used by the create-user modal to validate a username before submission.
usersRouter.get(
  '/users/username-availability',
  requireAdminMiddleware,
  usersController.getUsernameAvailability,
);

// Used by administrators to open an operate-under session for a selected user.
usersRouter.post('/users/ouc', requireAdminMiddleware, usersController.postUsersOuc);

// Used by administrators to email a newly created user's registration link.
usersRouter.post(
  '/users/invite-email',
  requireAdminMiddleware,
  usersController.postUserInviteEmail,
);

// Used by the administrator page to create a user from a username, email, or both.
usersRouter.post('/users', requireAdminMiddleware, usersController.postUsers);

// Used by the administrator page to issue a temporary password for a user.
usersRouter.patch('/users', requireAdminMiddleware, usersController.patchUsers);

// Used by the administrator page to delete a selected user's account and data.
usersRouter.delete('/users', requireAdminMiddleware, usersController.deleteUsers);
