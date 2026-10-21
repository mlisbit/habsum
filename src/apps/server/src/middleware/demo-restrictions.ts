import type { RequestHandler } from 'express';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import { resolveActiveSessionId } from '../utils/cookie-session-utils.js';
import getDemoRestrictionContext from '../utils/get-demo-restriction-context.js';
import type { DemoRestrictionContext } from '../utils/get-demo-restriction-context.js';
import isDemoEnabled from '../utils/is-demo-enabled.js';

const userAndAuthRepository = new UserAndAuthRepository();

const demoRestrictions: RequestHandler = (req, _res, next) => {
  let user: DemoRestrictionContext['user'] = null;
  if (isDemoEnabled()) {
    const sessionId = resolveActiveSessionId(req);
    const username = sessionId ? userAndAuthRepository.getUsernameForSession(sessionId) : null;
    if (sessionId && username) {
      user = {
        username,
        admin: userAndAuthRepository.isUserAdmin(username),
        isOucSession: userAndAuthRepository.isOucSessionId(sessionId),
      };
    }
  }

  getDemoRestrictionContext().run({ user }, next);
};

export default demoRestrictions;
