import type { Request, Response } from 'express';
import { UserService } from '../../services/user-service.js';
import { sendServiceResult } from '../controller-errors.js';

const userService = new UserService();

export const configController = {
  getConfig(req: Request<{ user: string }>, res: Response) {
    return sendServiceResult(res, () => userService.getUserConfig(req.params.user));
  },

  putConfig(req: Request<{ user: string }>, res: Response) {
    return sendServiceResult(res, () => userService.putUserConfig(req.params.user, req.body));
  },
};
