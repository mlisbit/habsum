import { Router } from 'express';
import { usersController } from '../users.controller.js';
import { restrictForDemoMiddleware } from '../../middleware/restrict-for-demo-middleware.js';

export const accountRouter = Router({ mergeParams: true });

// Used by account settings to update the authenticated user's profile preferences.
accountRouter.patch(
  '/',
  restrictForDemoMiddleware({ restriction: 'profile' }),
  usersController.patchUser,
);

// Used by account settings to permanently delete the authenticated user's account.
accountRouter.delete('/', restrictForDemoMiddleware(), usersController.deleteUser);
