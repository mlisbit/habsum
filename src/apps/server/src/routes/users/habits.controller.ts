import type { Request, Response } from 'express';
import { dasherize } from '@habsum/utils/strings';
import { HistoryPagePresenter } from '../../presenters/history-page-presenter.js';
import { HabitRepository } from '../../repositories/habit-repository.js';
import { HabitDataService } from '../../services/habit-data-service.js';
import { HabitService } from '../../services/habit-service.js';
import type { HabitListQuery, PatchBody } from '../../types/habit.types.js';
import ServiceError from '../../utils/classes/service-error.js';
import getHabitFilter from '../../utils/get-habit-filter.js';
import getHabitHistoryDataQuery from '../../utils/get-habit-history-data-query.js';
import getHabitListContext from '../../utils/get-habit-list-context.js';
import getHabitListDataQuery from '../../utils/get-habit-list-data-query.js';
import { getHabitApiDate, getHabitApiToday } from '../../utils/server-time-utils.js';
import { UserService } from '../../services/user-service.js';
import { sendServiceResult } from '../../utils/controller-result-utils.js';

const habitRepository = new HabitRepository();
const habitDataService = new HabitDataService(habitRepository);
const habitService = new HabitService(habitRepository, habitDataService);
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
      const requestedAt = new Date();
      const userConfig = userService.loadUserConfig(user);
      const viewingDate = getHabitApiDate(req.query.date, requestedAt);
      const habitIds = getHabitFilter(req.query.filter ?? req.query.habitId);
      if (habitIds.length === 0) throw new ServiceError('bad_request', 'filter is required');
      const habitDefinitions = habitIds.map((habitId) => {
        const definition = userConfig.habits.find((habit) => dasherize(habit.name) === habitId);
        if (!definition) {
          throw new ServiceError('not_found', `habit not configured: ${habitId}`);
        }
        return definition;
      });
      const historyData = habitDataService.loadSnapshot(
        getHabitHistoryDataQuery({
          user,
          habits: habitDefinitions,
          viewDate: viewingDate,
        }),
      );

      return new HistoryPagePresenter({
        user,
        userConfig,
        habitDefinitions,
        habitData: historyData,
        viewingDate,
        today: getHabitApiToday(requestedAt),
        requestedAt,
      }).present();
    });
  },

  getHabits(req: Request<{ user: string }, unknown, unknown, HabitListQuery>, res: Response) {
    return sendServiceResult(res, () => {
      const requestedAt = new Date();
      const userConfig = userService.loadUserConfig(req.params.user);
      const viewContext = getHabitListContext({
        query: req.query,
        requestedAt,
      });
      const dataQuery = getHabitListDataQuery({
        config: userConfig,
        context: viewContext,
      });
      const habitData = habitDataService.loadSnapshot(dataQuery);

      return habitService.presentHabitList({
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
