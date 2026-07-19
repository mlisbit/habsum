import { Router } from 'express';
import { habitsController } from './habits.controller.js';
import { requireMatchingRouteUser } from '../../middleware/auth.js';

export const habitsRouter = Router();

// Used by the habit detail view to load filtered history and insight widgets.
habitsRouter.get(
  '/users/:user/habits/history',
  requireMatchingRouteUser,
  habitsController.getHabitsHistory,
);

// Used by the main habits page to load the user's habits for the selected day.
habitsRouter.get('/users/:user/habits', requireMatchingRouteUser, habitsController.getHabits);

// Used by habit list and detail views to record, update, clear, or delete habit events.
habitsRouter.patch('/users/:user/habits', requireMatchingRouteUser, habitsController.patchHabits);
