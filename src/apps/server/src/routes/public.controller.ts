import type { DeveloperGetResponse } from '@habsum/types/api-responses/developer-get';
import type { HealthResponse } from '@habsum/types/common/misc';
import type { Request, Response } from 'express';
import getPackageVersion from '../utils/get-package-version.js';
import { getApiServerTimeSnapshot } from '../utils/server-time-utils.js';

const PACKAGE_VERSION = getPackageVersion();

export const publicController = {
  getHealth(_req: Request, res: Response) {
    const body: HealthResponse = { ok: true };
    return res.json(body);
  },

  getDeveloper(_req: Request, res: Response) {
    const body: DeveloperGetResponse = {
      time: getApiServerTimeSnapshot(),
      version: {
        currentVersion: PACKAGE_VERSION,
      },
    };
    return res.json(body);
  },
};
