import { Router } from 'express';
import { configController } from './config.controller.js';
import { restrictForDemoMiddleware } from '../../middleware/restrict-for-demo-middleware.js';

export const configRouter = Router({ mergeParams: true });

// Used by habit settings to load the user's editable habit configuration.
configRouter.get('/config', configController.getConfig);

// Used by habit settings to save structured or YAML configuration changes.
configRouter.put('/config', restrictForDemoMiddleware(), configController.putConfig);
