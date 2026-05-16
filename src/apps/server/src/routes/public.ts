import { Router } from 'express';
import type { HealthResponse } from '@habsum/types/common/misc';
import type { DeveloperGetResponse } from '@habsum/types/api-responses/developer-get';
import { apiServerTimeSnapshot } from '../server-time.js';
import { PACKAGE_VERSION } from '../version.js';

export const publicRouter = Router();

publicRouter.get('/health', (_req, res) => {
  const body: HealthResponse = { ok: true };
  res.json(body);
});

publicRouter.get('/time', (_req, res) => {
  res.json(apiServerTimeSnapshot());
});

publicRouter.get('/developer', (_req, res) => {
  const body: DeveloperGetResponse = {
    time: apiServerTimeSnapshot(),
    version: {
      currentVersion: PACKAGE_VERSION,
    },
  };
  res.json(body);
});
