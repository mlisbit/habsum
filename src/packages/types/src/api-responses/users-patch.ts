import type { MeGetResponse } from './me-get.js';

/**
 * PATCH /users/:user
 *
 * Partial of the authenticated {@link MeGetResponse} profile. `createdAt` and `entitlements` are
 * read-only and cannot be patched.
 *
 * - `username`: new login username / YAML id when renaming (optional; omit when not changing id).
 * - `displayName`, `email`, `hometown`: same semantics as in `MeGetResponse` (logged-in).
 * - `theme`: `light` / `dark`, or `system` to clear the stored preference (OS default).
 */
export type UsersPatchRequest = Partial<
  Omit<Extract<MeGetResponse, { username: string }>, 'createdAt' | 'entitlements'>
>;
