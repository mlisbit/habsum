import type { UserPasswordChangeRequest } from '@habsum/types/api-responses/user-password-change';
import type { Request, Response } from 'express';
import { UserService } from '../../services/user-service.js';
import { sendServiceResult } from '../../utils/controller-result-utils.js';

const userService = new UserService();

export const securityController = {
  getSecurity(req: Request<{ user: string }>, res: Response) {
    return sendServiceResult(res, () =>
      userService.getSecuritySessions(req.params.user, res.locals.session?.sessionToken),
    );
  },

  deleteSecuritySessions(req: Request<{ user: string }>, res: Response) {
    return sendServiceResult(res, () =>
      userService.deleteOtherSecuritySessions(
        req.params.user,
        res.locals.session?.sessionToken ?? null,
      ),
    );
  },

  deleteSecuritySession(req: Request<{ user: string; token: string }>, res: Response) {
    const { user, token } = req.params;
    return sendServiceResult(res, () =>
      userService.deleteSecuritySession(user, token, res.locals.session?.sessionToken),
    );
  },

  postPassword(req: Request<{ user: string }, unknown, UserPasswordChangeRequest>, res: Response) {
    return sendServiceResult(res, () => userService.changePassword(req.params.user, req.body));
  },
};
