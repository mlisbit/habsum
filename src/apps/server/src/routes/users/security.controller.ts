import type { UserPasswordChangeRequest } from '@habsum/types/api-responses/user-password-change';
import type { Request, Response } from 'express';
import { authenticatedSessionId } from '../../middleware/auth.js';
import { UserService } from '../../services/user-service.js';

const userService = new UserService();

export const securityController = {
  getSecurity(req: Request<{ user: string }>, res: Response) {
    const result = userService.getSecuritySessions(
      req.params.user,
      authenticatedSessionId(req) ?? undefined,
    );
    return res.status(result.status).json(result.body);
  },

  deleteSecuritySessions(req: Request<{ user: string }>, res: Response) {
    const result = userService.deleteOtherSecuritySessions(
      req.params.user,
      authenticatedSessionId(req),
    );
    return res.status(result.status).json(result.body);
  },

  deleteSecuritySession(req: Request<{ user: string; token: string }>, res: Response) {
    const { user, token } = req.params;
    const result = userService.deleteSecuritySession(
      user,
      token,
      authenticatedSessionId(req) ?? undefined,
    );
    return res.status(result.status).json(result.body);
  },

  postPassword(req: Request<{ user: string }, unknown, UserPasswordChangeRequest>, res: Response) {
    const result = userService.changePassword(req.params.user, req.body);
    return res.status(result.status).json(result.body);
  },
};
