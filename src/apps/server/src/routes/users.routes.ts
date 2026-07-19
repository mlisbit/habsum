import { Router } from 'express';
import { usersController } from './users.controller.js';
import { requireAdmin, requireMatchingRouteUser } from '../middleware/auth.js';

export const usersRouter = Router();

// Used by the global user context to resolve the active user's profile, role, and permissions.
usersRouter.get('/users/me', usersController.getMe);

// Used by account settings to update the authenticated user's profile preferences.
usersRouter.patch('/users/:user', requireMatchingRouteUser, usersController.patchUser);

// Used by account settings to permanently delete the authenticated user's account.
usersRouter.delete('/users/:user', requireMatchingRouteUser, usersController.deleteUser);

// Used by the administrator developer page to list users and their account metadata.
usersRouter.get('/users', requireAdmin, usersController.getUsers);

// Used by administrators to open an operate-under session for a selected user.
usersRouter.post('/users/ouc', requireAdmin, usersController.postUsersOuc);

// Used by the administrator developer page to create a user and optionally send an invitation.
usersRouter.post('/users', requireAdmin, usersController.postUsers);

// Used by the administrator developer page to issue a temporary password for a user.
usersRouter.patch('/users', requireAdmin, usersController.patchUsers);

// Used by the administrator developer page to delete a selected user's account and data.
usersRouter.delete('/users', requireAdmin, usersController.deleteUsers);
