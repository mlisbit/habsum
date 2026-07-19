import type { Request, Response } from 'express';
import { UserService } from '../../services/user-service.js';

const userService = new UserService();

export const configController = {
  getConfig(req: Request<{ user: string }>, res: Response) {
    const result = userService.getUserConfig(req.params.user);
    return res.status(result.status).json(result.body);
  },

  putConfig(req: Request<{ user: string }>, res: Response) {
    const result = userService.putUserConfig(req.params.user, req.body);
    return res.status(result.status).json(result.body);
  },
};
