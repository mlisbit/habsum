import { Router } from 'express';
import { publicController } from './public.controller.js';

export const publicRouter = Router();

// Used by deployment health probes to verify that the API process is responsive.
publicRouter.get('/health', publicController.getHealth);

// Application metadata and feature availability used on every page.
publicRouter.get('/application', publicController.getApplication);

publicRouter.get('/application/updates', publicController.getApplicationUpdates);
