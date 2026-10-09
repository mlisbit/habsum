import type { FeatureFlagKey } from '@habsum/types/api-responses/feature-flags';
import { FEATURE_FLAG_KEYS } from '../constants.js';

export default function isFeatureFlagKey(value: unknown): value is FeatureFlagKey {
  return typeof value === 'string' && (FEATURE_FLAG_KEYS as readonly string[]).includes(value);
}
