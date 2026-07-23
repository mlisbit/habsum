import type { HabitRepository } from '../../repositories/habit-repository.js';
import type { HabitDef } from '../../types/userConfig.js';
import type { HabitTypeService } from './habit-type-service.js';
import { SingleSelectHabitService } from './single-select-habit-service.js';
import { SummationHabitService } from './summation-habit-service.js';

type HabitMutationRepository = Pick<HabitRepository, 'applyHabitMutation'>;

export function createHabitTypeService(
  habit: HabitDef,
  repository: HabitMutationRepository,
): HabitTypeService {
  switch (habit.type) {
    case 'single_select':
      return new SingleSelectHabitService(habit, repository);
    case 'summation':
      return new SummationHabitService(habit, repository);
  }
}
