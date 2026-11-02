import type { Request, Response } from 'express';
import { UserService } from '../../services/user-service.js';
import { sendServiceResult } from '../../utils/controller-result-utils.js';
import getConfigVersion from '../../utils/get-config-version.js';

const userService = new UserService();

export const configController = {
  getConfig(req: Request<{ user: string }>, res: Response) {
    return sendServiceResult(res, () =>
      userService.getUserConfig(req.params.user, getConfigVersion(req.query.v)),
    );
  },

  putConfig(req: Request<{ user: string }>, res: Response) {
    return sendServiceResult(res, () => userService.putUserConfig(req.params.user, req.body));
  },
};
