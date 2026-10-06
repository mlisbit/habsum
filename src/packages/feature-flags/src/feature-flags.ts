export const FEATURE_FLAG_ENABLED_VALUE = 'enabled';

export const FEATURE_FLAG_KEYS = ['enable-user-account-creation'] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export function isFeatureFlagKey(value: unknown): value is FeatureFlagKey {
  return typeof value === 'string' && (FEATURE_FLAG_KEYS as readonly string[]).includes(value);
}

export function isFeatureFlagValueEnabled(value: string | null | undefined): boolean {
  return value != null;
}
