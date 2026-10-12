/** Minimum seconds between password-reset emails for the same user. */
export const PASSWORD_RESET_COOLDOWN_SECONDS = 30;

/** Invite link lifetime (admin-created accounts). */
export const INVITE_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export type PasswordResetTokenPurpose = 'reset' | 'invite';
