import type { Request, Response } from 'express';
import { HabitService } from '../../services/habit-service.js';
import type { PatchBody } from '../../services/habit-service.utils.js';
import { UserService } from '../../services/user-service.js';
import { sendServiceResult } from '../controller-errors.js';

const habitService = new HabitService();
const userService = new UserService();

export const habitsController = {
  getHabitsHistory(
    req: Request<
      { user: string },
      unknown,
      unknown,
      { filter?: string; habitId?: string; date?: string }
    >,
    res: Response,
  ) {
    return sendServiceResult(res, () => {
      const { user } = req.params;
      return habitService.getHabitHistory({
        user,
        config: userService.loadUserConfig(user),
        query: req.query,
        at: new Date(),
      });
    });
  },

  getHabits(
    req: Request<{ user: string }, unknown, unknown, { date?: string; tzOffsetMinutes?: string }>,
    res: Response,
  ) {
    return sendServiceResult(res, () =>
      habitService.getHabits({
        config: userService.loadUserConfig(req.params.user),
        query: req.query,
        at: new Date(),
      }),
    );
  },

  patchHabits(req: Request<{ user: string }, unknown, PatchBody>, res: Response) {
    return sendServiceResult(res, () => {
      const { user } = req.params;
      return habitService.patchHabit({
        user,
        config: userService.loadUserConfig(user),
        body: req.body,
        at: new Date(),
      });
    });
  },
};
