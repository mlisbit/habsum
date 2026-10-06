import type { AdministratorGetResponse } from '@habsum/types/api-responses/administrator-get';
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

  getAdministrator(_req: Request, res: Response) {
    const body: AdministratorGetResponse = {
      time: getApiServerTimeSnapshot(),
      version: {
        currentVersion: PACKAGE_VERSION,
      },
    };
    return res.json(body);
  },
};
