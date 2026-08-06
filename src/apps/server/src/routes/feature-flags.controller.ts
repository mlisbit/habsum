import { isFeatureFlagKey, type FeatureFlagKey } from '@habsum/feature-flags/feature-flags';
import type {
  FeatureFlagPostRequest,
  FeatureFlagPostResponse,
  FeatureFlagsGetResponse,
} from '@habsum/feature-flags/types';
import type { Request, Response } from 'express';
import { FeatureFlagRepository } from '../repositories/feature-flag-repository.js';

const featureFlagRepository = new FeatureFlagRepository();

export const featureFlagsController = {
  getFeatureFlags(_req: Request, res: Response) {
    const body: FeatureFlagsGetResponse<FeatureFlagKey> = {
      flags: featureFlagRepository.listFeatureFlags(),
    };
    return res.json(body);
  },

  postFeatureFlag(req: Request<unknown, unknown, Partial<FeatureFlagPostRequest>>, res: Response) {
    const key = req.body?.key;
    const value = req.body?.value;
    if (!isFeatureFlagKey(key)) {
      return res.status(400).json({ error: 'invalid feature flag key' });
    }
    if (value !== null && typeof value !== 'string') {
      return res.status(400).json({ error: 'value must be a string or null' });
    }

    const body: FeatureFlagPostResponse<FeatureFlagKey> = {
      flag: featureFlagRepository.setFeatureFlagValue(key, value),
    };
    return res.json(body);
  },
};
