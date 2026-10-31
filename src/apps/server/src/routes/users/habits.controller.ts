import type { Request, Response } from 'express';
import { dasherize } from '@habsum/utils/strings';
import { UserHabitRepository } from '../../repositories/user-habit-repository.js';
import { HabitService } from '../../services/habit-service.js';
import type { HabitListQuery, PatchBody } from '../../types/habit.types.js';
import ServiceError from '../../utils/classes/service-error.js';
import getHabitFilter from '../../utils/get-habit-filter.js';
import getHabitListContext from '../../utils/get-habit-list-context.js';
import { getHabitApiDate, getHabitApiToday } from '../../utils/server-time-utils.js';
import { UserService } from '../../services/user-service.js';
import { sendServiceResult } from '../../utils/controller-result-utils.js';

const userService = new UserService();

export const habitsController = {
  getHabitsHistory(
    req: Request<
      { user: string },
      unknown,
      unknown,
      { filter?: string; habitId?: string; date?: string; today?: string }
    >,
    res: Response,
  ) {
    return sendServiceResult(res, () => {
      const { user } = req.params;
      const habitRepository = new UserHabitRepository(user, userService);
      const habitService = new HabitService(habitRepository);
      const requestedAt = new Date();
      const { userConfig } = habitRepository;
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
      const hydratedHabits = habitRepository.loadHydratedHabits(
        habitRepository.getHabitHistoryDataQuery({
          habitNames: habitDefinitions.map((habit) => habit.name),
          viewDate: viewingDate,
        }),
      );

      return habitService.getHabitHistoryPresentation({
        user,
        habitDefinitions,
        hydratedHabits,
        viewingDate,
        today: getHabitApiToday(req.query.today, requestedAt),
        requestedAt,
      });
    });
  },

  getHabits(req: Request<{ user: string }, unknown, unknown, HabitListQuery>, res: Response) {
    return sendServiceResult(res, () => {
      const { user } = req.params;
      const habitRepository = new UserHabitRepository(user, userService);
      const habitService = new HabitService(habitRepository);
      const requestedAt = new Date();
      const viewContext = getHabitListContext({
        query: req.query,
        requestedAt,
      });
      const dataQuery = habitRepository.getHabitListDataQuery(viewContext);
      const metadata = habitRepository.getDataMetadata();
      const hydratedHabits = habitRepository.loadHydratedHabits(dataQuery, {
        firstRecordedDate: metadata.firstRecordedDate,
      });

      return habitService.getHabitListPresentation({
        user,
        context: viewContext,
        metadata,
        hydratedHabits,
      });
    });
  },

  patchHabits(req: Request<{ user: string }, unknown, PatchBody>, res: Response) {
    return sendServiceResult(res, () => {
      const { user } = req.params;
      const habitService = new HabitService(new UserHabitRepository(user, userService));
      return habitService.patchHabit({
        user,
        body: req.body,
        at: new Date(),
      });
    });
  },
};
