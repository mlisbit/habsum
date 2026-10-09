import type {
  FeatureFlagKey,
  FeatureFlagPostRequest,
  FeatureFlagPostResponse,
  FeatureFlagsGetResponse,
} from '@habsum/types/api-responses/feature-flags';
import type { Request, Response } from 'express';
import { FeatureFlagService } from '../services/feature-flag-service.js';
import isFeatureFlagKey from '../utils/is-feature-flag-key.js';
import isFeatureFlagValue from '../utils/is-feature-flag-value.js';

const featureFlagService = new FeatureFlagService();

export const featureFlagsController = {
  getFeatureFlags(_req: Request, res: Response) {
    const body: FeatureFlagsGetResponse<FeatureFlagKey> = {
      flags: featureFlagService.listFeatureFlags(),
    };
    return res.json(body);
  },

  postFeatureFlag(req: Request<unknown, unknown, Partial<FeatureFlagPostRequest>>, res: Response) {
    const key = req.body?.key;
    const value = req.body?.value;
    if (!isFeatureFlagKey(key)) {
      return res.status(400).json({ error: 'invalid feature flag key' });
    }
    if (!isFeatureFlagValue(key, value) || !featureFlagService.isFlagValueAvailable(key, value)) {
      return res.status(400).json({ error: 'invalid feature flag value' });
    }

    const body: FeatureFlagPostResponse<FeatureFlagKey> = {
      flag: featureFlagService.setFeatureFlagValue(key, value),
    };
    return res.json(body);
  },
};
