import type { HabitRepository } from '../../repositories/habit-repository.js';
import { SingleSelectHabitService } from '../../services/habits/single-select-habit-service.js';
import { SummationHabitService } from '../../services/habits/summation-habit-service.js';
import type { HabitTypeService } from '../../services/habits/habit-type-service.js';
import type { HabitDef } from '../../types/userConfig.js';

type HabitMutationRepository = Pick<HabitRepository, 'applyHabitMutation'>;

export default function getHabitTypeService(
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
