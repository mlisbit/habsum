import { UpdateService } from '../services/update-service.js';
import { ApplicationService } from '../services/application-service.js';
import { sendAsyncServiceResult, sendServiceResult } from '../utils/controller-result-utils.js';
import type { HealthResponse } from '@habsum/types/common/misc';
import type { Request, Response } from 'express';

const applicationService = new ApplicationService();
const updateService = new UpdateService();

export const publicController = {
  getApplication(_req: Request, res: Response) {
    return sendServiceResult(res, () => applicationService.getApplication());
  },
  getApplicationUpdates(req: Request, res: Response) {
    return sendAsyncServiceResult(res, () => updateService.getUpdates(req.query.webVersion));
  },
  getHealth(_req: Request, res: Response) {
    const body: HealthResponse = { ok: true };
    return res.json(body);
  },
};
