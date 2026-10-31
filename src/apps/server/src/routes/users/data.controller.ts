import type { Request, Response } from 'express';
import { UserHabitRepository } from '../../repositories/user-habit-repository.js';
import { buildUserDataCsv } from '../../services/data-export-service.js';
import { UserService } from '../../services/user-service.js';
import { sendServiceError } from '../../utils/controller-result-utils.js';

const userService = new UserService();

export const dataController = {
  getData(req: Request<{ user: string }>, res: Response) {
    const { user } = req.params;
    try {
      const habitRepository = new UserHabitRepository(user, userService);
      return res
        .status(200)
        .type('text/csv')
        .set('Content-Disposition', `attachment; filename="${user}-habsum-data.csv"`)
        .send(buildUserDataCsv(habitRepository));
    } catch (error) {
      return sendServiceError(error, res);
    }
  },
};
