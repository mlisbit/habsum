import type {
  AdministratorEmailSettingsPutRequest,
  AdministratorEmailTestRequest,
} from '@habsum/types/api-responses/administrator-email-settings';
import type { AdministratorDatabaseDeleteRequest } from '@habsum/types/api-responses/administrator-database';
import type { Request, Response } from 'express';
import { AdministratorService } from '../services/administrator-service.js';
import {
  sendAsyncServiceResult,
  sendServiceError,
  sendServiceResult,
} from '../utils/controller-result-utils.js';

const administratorService = new AdministratorService();

export const administratorController = {
  getDatabase(_req: Request, res: Response) {
    return sendServiceResult(res, () => administratorService.getDatabase());
  },

  downloadDatabase(_req: Request, res: Response) {
    try {
      const databaseFile = administratorService.getDatabaseFile();
      res.set({
        'Content-Disposition': 'attachment; filename="habsum.db"',
        'Content-Type': 'application/vnd.sqlite3',
      });
      return res.send(databaseFile);
    } catch (error) {
      return sendServiceError(error, res);
    }
  },

  deleteDatabase(
    req: Request<unknown, unknown, AdministratorDatabaseDeleteRequest>,
    res: Response,
  ) {
    let deleted = false;
    res.once('finish', () => {
      if (!deleted || process.env.NODE_ENV === 'test') return;
      setImmediate(() => process.kill(process.pid, 'SIGTERM'));
    });
    return sendServiceResult(res, () => {
      const result = administratorService.deleteDatabase(req.body);
      deleted = true;
      return result;
    });
  },

  getEmailSettings(_req: Request, res: Response) {
    return sendServiceResult(res, () => administratorService.getEmailSettings());
  },

  putEmailSettings(
    req: Request<unknown, unknown, AdministratorEmailSettingsPutRequest>,
    res: Response,
  ) {
    return sendServiceResult(res, () => administratorService.updateEmailSettings(req.body));
  },

  postEmailTest(req: Request<unknown, unknown, AdministratorEmailTestRequest>, res: Response) {
    return sendAsyncServiceResult(res, () => administratorService.sendTestEmail(req.body));
  },
};
