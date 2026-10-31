import { Router } from 'express';
import { dataController } from './data.controller.js';

export const dataRouter = Router({ mergeParams: true });

// Used by account settings to download the user's habit history as a CSV export.
dataRouter.get('/data', dataController.getData);
