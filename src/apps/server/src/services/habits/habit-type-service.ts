import type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
import type { Day } from '@habsum/types/common/day';
import type { Habit } from '@habsum/types/common/habit';
import type { HabitRepository } from '../../repositories/habit-repository.js';
import type { InterimHabit, InterimHabitsData } from '../../types/habit.types.js';
import type { HabitDef, HabitType } from '../../types/userConfig.js';
import type { PatchBody } from '../habit-service.utils.js';

export type HabitDefOf<T extends HabitType> = HabitDef & { type: T };

export type HabitMutationRepository = Pick<HabitRepository, 'applyHabitMutation'>;

export type ApplyHabitPatchInput = {
  user: string;
  date: Day;
  body: PatchBody;
};

export type BuildPatchResponseInput = {
  data: InterimHabitsData;
  date: Day;
  result: Habit;
  interimHabit: InterimHabit;
};

export type PatchHabitResponseFor<THabit extends Habit> = Extract<
  PatchHabitResponse,
  { type: THabit['type'] }
>;

/**
 * Type-specific behavior used by the public HabitService facade.
 *
 * A service instance belongs to one configured habit. Implementations own all
 * branching that depends on that habit's type.
 */
export interface HabitTypeService<THabit extends Habit = Habit> {
  readonly habit: HabitDefOf<THabit['type']>;

  historyDates(interimHabit: InterimHabit): Day[];
  historyHabit(interimHabit: InterimHabit, date: Day): THabit;
  emptyHistoryHabit(): THabit;
  applyPatch(input: ApplyHabitPatchInput): void;
  buildPatchResponse(input: BuildPatchResponseInput): PatchHabitResponseFor<THabit>;
}

export function assertHabitDefType<T extends HabitType>(
  habit: HabitDef,
  type: T,
): asserts habit is HabitDefOf<T> {
  if (habit.type !== type) {
    throw new Error(`expected ${type} habit, received ${habit.type}`);
  }
}
