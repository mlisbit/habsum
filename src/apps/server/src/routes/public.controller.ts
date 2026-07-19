import type { DeveloperGetResponse } from '@habsum/types/api-responses/developer-get';
import type { HealthResponse } from '@habsum/types/common/misc';
import type { Request, Response } from 'express';
import { apiServerTimeSnapshot } from '../server-time.js';
import { PACKAGE_VERSION } from '../version.js';

export const publicController = {
  getHealth(_req: Request, res: Response) {
    const body: HealthResponse = { ok: true };
    return res.json(body);
  },

  getDeveloper(_req: Request, res: Response) {
    const body: DeveloperGetResponse = {
      time: apiServerTimeSnapshot(),
      version: {
        currentVersion: PACKAGE_VERSION,
      },
    };
    return res.json(body);
  },
};
