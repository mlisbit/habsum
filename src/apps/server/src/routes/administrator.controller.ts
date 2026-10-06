import type { AdministratorEmailSettingsPutRequest } from '@habsum/types/api-responses/administrator-email-settings';
import type { Request, Response } from 'express';
import { AdministratorService } from '../services/administrator-service.js';
import { sendAsyncServiceResult, sendServiceResult } from '../utils/controller-result-utils.js';

const administratorService = new AdministratorService();

export const administratorController = {
  getEmailSettings(_req: Request, res: Response) {
    return sendServiceResult(res, () => administratorService.getEmailSettings());
  },

  putEmailSettings(
    req: Request<unknown, unknown, AdministratorEmailSettingsPutRequest>,
    res: Response,
  ) {
    return sendServiceResult(res, () => administratorService.updateEmailSettings(req.body));
  },

  postEmailTest(_req: Request, res: Response) {
    return sendAsyncServiceResult(res, () =>
      administratorService.sendTestEmail(res.locals.sessionUser ?? ''),
    );
  },
};
