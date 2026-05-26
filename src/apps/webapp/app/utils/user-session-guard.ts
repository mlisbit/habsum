import type { MeGetResponse } from '@habsum/types/api-responses/me-get';

export function userNewPasswordPath(user: string): string {
  return `/users/${encodeURIComponent(user)}/new-password`;
}

export function userDefaultAppPath(user: string, forcePasswordReset: boolean): string {
  return forcePasswordReset
    ? userNewPasswordPath(user)
    : `/users/${encodeURIComponent(user)}/habits`;
}

export function isMeLoggedIn(
  me: MeGetResponse,
): me is MeGetResponse & { username: string; forcePasswordReset: boolean } {
  return me.username != null;
}

type GuardOptions = {
  /** Use on `/users/:user/new-password` so the reset form can render. */
  allowNewPasswordRoute?: boolean;
  /** Remix client navigation; omit only outside the router tree. */
  navigate: (to: string) => void;
};

/**
 * Ensures `me` matches `routeUser`. Redirects to login or the forced new-password flow when needed.
 * @returns true when the route may render.
 */
export function ensureUserSessionForRoute(
  routeUser: string,
  me: MeGetResponse,
  options: GuardOptions,
): boolean {
  const { navigate } = options;
  if (!isMeLoggedIn(me) || me.username !== routeUser) {
    navigate('/login');
    return false;
  }
  if (me.forcePasswordReset && !options.allowNewPasswordRoute) {
    navigate(userNewPasswordPath(routeUser));
    return false;
  }
  if (!me.forcePasswordReset && options.allowNewPasswordRoute) {
    navigate(`/users/${encodeURIComponent(routeUser)}/habits`);
    return false;
  }
  return true;
}
