import { Router } from 'express';
import { requireDeveloper } from '../middleware/auth.js';
import { featureFlagsController } from './feature-flags.controller.js';

export const featureFlagsRouter = Router();

// Used by the web server during SSR to inline flags into the initial application payload.
featureFlagsRouter.get('/feature-flags', featureFlagsController.getFeatureFlags);

// Used by developers to update one flag before the client performs a full page reload.
featureFlagsRouter.post('/feature-flags', requireDeveloper, featureFlagsController.postFeatureFlag);
