import type { Request, Response } from 'express';
import { HabitRepository } from '../../repositories/habit-repository.js';
import { HabitDataService } from '../../services/habit-data-service.js';
import { HabitPresentationService } from '../../services/habit-presentation-service.js';
import { HabitService } from '../../services/habit-service.js';
import type { PatchBody } from '../../services/habit-service.utils.js';
import {
  buildHabitListDataQuery,
  resolveHabitListContext,
  type HabitListQuery,
} from '../../services/habits/habit-data-query.js';
import { UserService } from '../../services/user-service.js';
import { sendServiceResult } from '../controller-errors.js';

const habitRepository = new HabitRepository();
const habitDataService = new HabitDataService(habitRepository);
const habitPresentationService = new HabitPresentationService();
const habitService = new HabitService(habitRepository, habitDataService, habitPresentationService);
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

  getHabits(req: Request<{ user: string }, unknown, unknown, HabitListQuery>, res: Response) {
    return sendServiceResult(res, () => {
      const requestedAt = new Date();
      const userConfig = userService.loadUserConfig(req.params.user);
      const viewContext = resolveHabitListContext({
        query: req.query,
        requestedAt,
      });
      const dataQuery = buildHabitListDataQuery({
        config: userConfig,
        context: viewContext,
      });
      const habitData = habitDataService.loadSnapshot(dataQuery);

      return habitPresentationService.presentHabitList({
        config: userConfig,
        context: viewContext,
        data: habitData,
      });
    });
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
