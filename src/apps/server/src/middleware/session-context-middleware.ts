import type { NextFunction, Request, Response } from 'express';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import SessionContext from '../utils/classes/session-context.js';
import { getOucSessionHeader, getSessionCookieValue } from '../utils/cookie-session-utils.js';

const userAndAuthRepository = new UserAndAuthRepository();

export default function sessionContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // The app's user parameter hook reuses the context created before routing.
  if (!Object.hasOwn(res.locals, 'session')) {
    let sessionToken = getOucSessionHeader(req);
    let username =
      sessionToken && userAndAuthRepository.isOucSessionId(sessionToken)
        ? userAndAuthRepository.getUsernameForSession(sessionToken)
        : null;

    if (!username) {
      sessionToken = getSessionCookieValue(req.headers.cookie);
      username = sessionToken ? userAndAuthRepository.getUsernameForSession(sessionToken) : null;
    }

    res.locals.session =
      username && sessionToken
        ? new SessionContext(
            username,
            sessionToken,
            userAndAuthRepository.isDemoUser(username),
            userAndAuthRepository.isOucSessionId(sessionToken),
            userAndAuthRepository.isUserAdmin(username),
          )
        : null;
  }

  const routeUser = req.params.user;
  if (routeUser !== undefined) {
    const session = res.locals.session;
    if (!session) {
      res.status(401).json({ error: 'not authenticated' });
      return;
    }
    if (routeUser !== session.username) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
  }

  next();
}
