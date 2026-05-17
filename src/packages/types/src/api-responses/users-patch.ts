/**
 * PATCH /users/:user
 * - `name`: new login username / YAML id (rename).
 * - `displayName`: optional profile label stored in DB (`null` clears).
 * - `theme`: UI theme key (`light`, `dark`, …).
 */
export type UsersPatchRequest = {
  name?: string;
  displayName?: string | null;
  theme?: string;
};
