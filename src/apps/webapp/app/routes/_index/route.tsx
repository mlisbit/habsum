import { redirect } from 'react-router';
import { getAuthMe } from '~/api.server';
import { isMeLoggedIn, userDefaultAppPath } from '~/utils/user-session-guard';
import type { Route } from './+types/route';

export async function loader({ request }: Route.LoaderArgs) {
  const me = await getAuthMe(request);

  return redirect(isMeLoggedIn(me) ? userDefaultAppPath(me.username) : '/login');
}

export default function IndexRoute() {
  return null;
}
