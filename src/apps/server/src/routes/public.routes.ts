import { Router } from 'express';
import { publicController } from './public.controller.js';

export const publicRouter = Router();

// Used by deployment health probes to verify that the API process is responsive.
publicRouter.get('/health', publicController.getHealth);

// Used by the administrator page to display API version and server diagnostics.
publicRouter.get('/administrator', publicController.getAdministrator);
