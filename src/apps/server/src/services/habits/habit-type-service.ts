import type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
import type { Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import type { HabitRepository } from '../../repositories/habit-repository.js';
import type { HabitDataSnapshot, HydratedHabitData, PatchBody } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';

export type HabitMutationRepository = Pick<HabitRepository, 'applyHabitMutation'>;

export type ApplyHabitPatchInput = {
  user: string;
  date: Day;
  body: PatchBody;
};

export type BuildPatchResponseInput = {
  data: HabitDataSnapshot;
  date: Day;
  result: Habit;
  habitData: HydratedHabitData;
};

export type PatchHabitResponseFor<THabit extends Habit> = Extract<
  PatchHabitResponse,
  { type: THabit['type'] }
>;

/**
 * Type-specific mutation behavior used by the public HabitService facade.
 *
 * A service instance belongs to one configured habit and owns its patch
 * validation, persistence mutation, and transport response.
 */
export interface HabitTypeService<THabit extends Habit = Habit> {
  readonly habit: HabitDef<THabit['type']>;

  applyPatch(input: ApplyHabitPatchInput): void;
  buildPatchResponse(input: BuildPatchResponseInput): PatchHabitResponseFor<THabit>;
}
