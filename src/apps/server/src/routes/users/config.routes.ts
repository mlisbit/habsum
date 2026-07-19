import { Router } from 'express';
import { configController } from './config.controller.js';
import { requireMatchingRouteUser } from '../../middleware/auth.js';

export const configRouter = Router();

// Used by habit settings to load the user's editable habit configuration.
configRouter.get('/users/:user/config', requireMatchingRouteUser, configController.getConfig);

// Used by habit settings to save structured or YAML configuration changes.
configRouter.put('/users/:user/config', requireMatchingRouteUser, configController.putConfig);
