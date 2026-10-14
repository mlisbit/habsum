import { ApplicationService } from '../services/application-service.js';
import { sendServiceResult } from '../utils/controller-result-utils.js';
import type { HealthResponse } from '@habsum/types/common/misc';
import type { Request, Response } from 'express';

const applicationService = new ApplicationService();

export const publicController = {
  getApplication(_req: Request, res: Response) {
    return sendServiceResult(res, () => applicationService.getApplication());
  },
  getHealth(_req: Request, res: Response) {
    const body: HealthResponse = { ok: true };
    return res.json(body);
  },
};
