import type { FeatureFlagKey } from '@habsum/types/api-responses/feature-flags';
import { FEATURE_FLAG_DETAILS } from '../constants.js';

export default function isFeatureFlagValue(
  key: FeatureFlagKey,
  value: unknown,
): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  const options = FEATURE_FLAG_DETAILS[key].options as Record<string, { disabled?: string }>;
  return options[value] != null;
}
