import type { MeGetResponse } from '@habsum/types/api-responses/me-get';

export function userDefaultAppPath(user: string): string {
  return `/users/${encodeURIComponent(user)}/habits`;
}

export function isMeLoggedIn(me: MeGetResponse): me is MeGetResponse & { username: string } {
  return me.username != null;
}

type GuardOptions = {
  /** React Router client navigation; omit only outside the router tree. */
  navigate: (to: string) => void;
};

/**
 * Ensures `me` matches `routeUser`. Redirects to login when needed.
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
  return true;
}
