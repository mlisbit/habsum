import {
  isFeatureFlagValueEnabled,
  type FeatureFlagKey,
} from '@habsum/feature-flags/feature-flags';
import type { FeatureFlag } from '@habsum/feature-flags/types';
import { FeatureFlagRepository } from '../repositories/feature-flag-repository.js';

export class FeatureFlagService {
  constructor(private readonly featureFlagRepository = new FeatureFlagRepository()) {}

  isFlagEnabled(key: FeatureFlagKey): boolean {
    return isFeatureFlagValueEnabled(this.featureFlagRepository.getFeatureFlag(key)?.value);
  }

  listFeatureFlags(): FeatureFlag<FeatureFlagKey>[] {
    return this.featureFlagRepository.listFeatureFlags();
  }

  setFeatureFlagValue(key: FeatureFlagKey, value: string | null): FeatureFlag<FeatureFlagKey> {
    return this.featureFlagRepository.setFeatureFlagValue(key, value);
  }
}
