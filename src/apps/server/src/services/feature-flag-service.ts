import type { FeatureFlag, FeatureFlagKey } from '@habsum/types/api-responses/feature-flags';
import { FEATURE_FLAG_DETAILS } from '../constants.js';
import { EmailSettingsRepository } from '../repositories/email-settings-repository.js';
import { FeatureFlagRepository } from '../repositories/feature-flag-repository.js';

export class FeatureFlagService {
  constructor(
    private readonly featureFlagRepository = new FeatureFlagRepository(),
    private readonly emailSettingsRepository = new EmailSettingsRepository(),
  ) {}

  private getFeatureFlagDetails(
    key: FeatureFlagKey,
  ): Pick<FeatureFlag<FeatureFlagKey>, 'name' | 'description' | 'options'> {
    const details = FEATURE_FLAG_DETAILS[key];
    if (
      key !== 'enable-user-account-creation' ||
      this.emailSettingsRepository.getResendSettings() == null
    ) {
      return details;
    }

    const { disabled: _disabled, ...verify } = details.options.verify;
    return {
      ...details,
      options: {
        ...details.options,
        verify,
      },
    };
  }

  getFlagValue(key: FeatureFlagKey): string | null {
    return this.featureFlagRepository.getFeatureFlag(key)?.value ?? null;
  }

  isFlagValueAvailable(key: FeatureFlagKey, value: string | null): boolean {
    if (value === null) return true;
    const option = this.getFeatureFlagDetails(key).options[value];
    return option != null && option.disabled == null;
  }

  listFeatureFlags(): FeatureFlag<FeatureFlagKey>[] {
    return this.featureFlagRepository.listFeatureFlags().map((flag) => ({
      ...flag,
      ...this.getFeatureFlagDetails(flag.key),
    }));
  }

  setFeatureFlagValue(key: FeatureFlagKey, value: string | null): FeatureFlag<FeatureFlagKey> {
    return {
      ...this.featureFlagRepository.setFeatureFlagValue(key, value),
      ...this.getFeatureFlagDetails(key),
    };
  }
}
