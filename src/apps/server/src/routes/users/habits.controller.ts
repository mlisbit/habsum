import type { Request, Response } from 'express';
import { HabitService } from '../../services/habit-service.js';
import type { PatchBody } from '../../services/habit-service.utils.js';
import { UserService } from '../../services/user-service.js';

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
    const { user } = req.params;
    const configResult = userService.loadUserConfig(user);
    if (!configResult.ok) {
      return res.status(configResult.status).json(configResult.body);
    }

    const result = habitService.getHabitHistory({
      user,
      config: configResult.config,
      query: req.query,
      at: new Date(),
    });
    return res.status(result.status).json(result.body);
  },

  getHabits(
    req: Request<{ user: string }, unknown, unknown, { date?: string; tzOffsetMinutes?: string }>,
    res: Response,
  ) {
    const { user } = req.params;
    const configResult = userService.loadUserConfig(user);
    if (!configResult.ok) {
      return res.status(configResult.status).json(configResult.body);
    }

    const body = habitService.getHabits({
      config: configResult.config,
      query: req.query,
      at: new Date(),
    });
    return res.json(body);
  },

  patchHabits(req: Request<{ user: string }, unknown, PatchBody>, res: Response) {
    const { user } = req.params;
    const configResult = userService.loadUserConfig(user);
    if (!configResult.ok) {
      return res.status(configResult.status).json(configResult.body);
    }

    const result = habitService.patchHabit({
      user,
      config: configResult.config,
      body: req.body,
      at: new Date(),
    });
    return res.status(result.status).json(result.body);
  },
};
