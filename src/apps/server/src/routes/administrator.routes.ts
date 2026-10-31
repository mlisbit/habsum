import { Router } from 'express';
import { requireAdminMiddleware } from '../middleware/require-admin-middleware.js';
import { administratorController } from './administrator.controller.js';

export const administratorRouter = Router();

administratorRouter.get(
  '/administrator/database/download',
  requireAdminMiddleware,
  administratorController.downloadDatabase,
);
administratorRouter.delete(
  '/administrator/database',
  requireAdminMiddleware,
  administratorController.deleteDatabase,
);
administratorRouter.get(
  '/administrator/email-settings',
  requireAdminMiddleware,
  administratorController.getEmailSettings,
);
administratorRouter.put(
  '/administrator/email-settings',
  requireAdminMiddleware,
  administratorController.putEmailSettings,
);
administratorRouter.post(
  '/administrator/email-settings/test',
  requireAdminMiddleware,
  administratorController.postEmailTest,
);

administratorRouter.get(
  '/administrator/application-settings',
  requireAdminMiddleware,
  administratorController.getApplicationSettings,
);
administratorRouter.put(
  '/administrator/application-settings',
  requireAdminMiddleware,
  administratorController.putApplicationSettings,
);
