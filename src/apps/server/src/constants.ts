import type { FeatureFlag, FeatureFlagKey } from '@habsum/types/api-responses/feature-flags';

/** Minimum seconds between password-reset emails for the same user. */
export const PASSWORD_RESET_COOLDOWN_SECONDS = 30;

/** Invite link lifetime (admin-created accounts). */
export const INVITE_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export type PasswordResetTokenPurpose = 'reset' | 'invite';

export const FEATURE_FLAG_KEYS = [
  'enable-user-account-creation',
] as const satisfies readonly FeatureFlagKey[];

export const FEATURE_FLAG_DETAILS = {
  'enable-user-account-creation': {
    name: 'User registration',
    description: 'Allow users to create their own accounts.',
    options: {
      noVerify: { text: 'With no email verification' },
      verify: {
        text: 'With email verification',
        disabled: 'requires email configuration to be enabled',
      },
    },
  },
} as const satisfies Record<
  FeatureFlagKey,
  Pick<FeatureFlag<FeatureFlagKey>, 'name' | 'description' | 'options'>
>;
