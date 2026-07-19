import { Router } from 'express';
import { dataController } from './data.controller.js';
import { requireMatchingRouteUser } from '../../middleware/auth.js';

export const dataRouter = Router();

// Used by account settings to download the user's habit history as a CSV export.
dataRouter.get('/users/:user/data', requireMatchingRouteUser, dataController.getData);
