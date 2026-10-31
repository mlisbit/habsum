import type { RequestHandler } from 'express';
import { UserService } from '../services/user-service.js';
import { sendServiceError } from '../utils/controller-result-utils.js';
import isDemoEnabled from '../utils/is-demo-enabled.js';

type RestrictForDemoOptions = {
  restriction?: 'all' | 'profile' | 'text-habit';
};

const userService = new UserService();

export function restrictForDemoMiddleware({
  // kind of a hack tbh -- for some endpoints there's only certain things we want to block -- we dont
  // want to evvvverything. Adding a restriction allows us to target these specific cases, and still have a source
  // of truth for the error? Wondering if it'd be better to just have actions handle these specific cases themselves
  // by just looking to see if the session is a demo session.
  restriction = 'all',
}: RestrictForDemoOptions = {}): RequestHandler {
  return (req, res, next) => {
    const session = res.locals.session;
    if (!isDemoEnabled() || session?.isAdmin || session?.isOUCSession) {
      next();
      return;
    }

    if (restriction === 'profile') {
      const body = req.body;
      if (
        body == null ||
        typeof body !== 'object' ||
        !('username' in body || 'displayName' in body || 'email' in body)
      ) {
        next();
        return;
      }
    }

    if (restriction === 'text-habit') {
      if (typeof req.body?.habit !== 'string') {
        next();
        return;
      }

      try {
        const config = userService.loadUserConfig(req.params.user);
        const habit = config.habits.find((candidate) => candidate.name === req.body.habit);
        if (habit?.type !== 'text') {
          next();
          return;
        }
      } catch (error) {
        sendServiceError(error, res);
        return;
      }
    }

    res.status(403).json({ error: 'Action prevented for demo users.' });
  };
}
