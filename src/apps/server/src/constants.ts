/** Minimum seconds between password-reset emails for the same user. */
export const PASSWORD_RESET_COOLDOWN_SECONDS = 30;

/** Raw entropy for a password-reset link token. */
export const PASSWORD_RESET_TOKEN_BYTES = 32;

/** Password-reset link lifetime. */
export const PASSWORD_RESET_TOKEN_TTL_SECONDS = 15 * 60;
