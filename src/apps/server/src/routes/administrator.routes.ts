import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { administratorController } from './administrator.controller.js';

export const administratorRouter = Router();

administratorRouter.get(
  '/administrator/database/download',
  requireAdmin,
  administratorController.downloadDatabase,
);
administratorRouter.delete(
  '/administrator/database',
  requireAdmin,
  administratorController.deleteDatabase,
);
administratorRouter.get(
  '/administrator/email-settings',
  requireAdmin,
  administratorController.getEmailSettings,
);
administratorRouter.put(
  '/administrator/email-settings',
  requireAdmin,
  administratorController.putEmailSettings,
);
administratorRouter.post(
  '/administrator/email-settings/test',
  requireAdmin,
  administratorController.postEmailTest,
);

administratorRouter.get(
  '/administrator/registration-settings',
  requireAdmin,
  administratorController.getRegistrationSettings,
);
administratorRouter.put(
  '/administrator/registration-settings',
  requireAdmin,
  administratorController.putRegistrationSettings,
);
