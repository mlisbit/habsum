import { Router } from 'express';
import { habitsController } from './habits.controller.js';
import { restrictForDemoMiddleware } from '../../middleware/restrict-for-demo-middleware.js';

export const habitsRouter = Router({ mergeParams: true });

// Used by the habit detail view to load filtered history and insight widgets.
habitsRouter.get('/habits/history', habitsController.getHabitsHistory);

// Used by the main habits page to load the user's habits for the selected day.
habitsRouter.get('/habits', habitsController.getHabits);

// Used by habit list and detail views to record, update, clear, or delete habit events.
habitsRouter.patch(
  '/habits',
  restrictForDemoMiddleware({ restriction: 'text-habit' }),
  habitsController.patchHabits,
);
