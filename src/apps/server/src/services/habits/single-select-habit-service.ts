import type { Day } from '@habsum/types/common/day';
import type { HabitRowSingleSelect } from '@habsum/types/common/habit';
import { ServiceError } from '../../service-error.js';
import type { InterimHabit } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import type {
  ApplyHabitPatchInput,
  BuildPatchResponseInput,
  HabitMutationRepository,
  HabitTypeService,
  PatchHabitResponseFor,
} from './habit-type-service.js';

type InterimSingleSelectHabit = Extract<InterimHabit, { type: 'single_select' }>;

export class SingleSelectHabitService implements HabitTypeService<HabitRowSingleSelect> {
  constructor(
    readonly habit: HabitDef<'single_select'>,
    private readonly repository: HabitMutationRepository,
  ) {}

  historyDates(interimHabit: InterimHabit): Day[] {
    return this.singleSelectHabit(interimHabit).values.map((row) => row.date);
  }

  historyHabit(interimHabit: InterimHabit, date: Day): HabitRowSingleSelect {
    const typedHabit = this.singleSelectHabit(interimHabit);
    const emptyHabit = this.emptyHistoryHabit();
    return {
      ...emptyHabit,
      details: {
        ...emptyHabit.details,
        value: typedHabit.values.find((row) => row.date === date)?.value ?? null,
      },
    };
  }

  emptyHistoryHabit(): HabitRowSingleSelect {
    return {
      name: this.habit.name,
      type: 'single_select',
      details: {
        options: this.habit.settings.options,
        ...(this.habit.settings.theme ? { theme: this.habit.settings.theme } : {}),
        value: null,
      },
    };
  }

  applyPatch({ user, date, body }: ApplyHabitPatchInput): void {
    const action = typeof body.action === 'string' ? body.action : undefined;
    if (action === 'clear') {
      this.repository.applyHabitMutation({
        kind: 'clear_select',
        user,
        habit: this.habit.name,
        date,
      });
      return;
    }

    if (typeof body.value !== 'string' || body.value.length === 0) {
      throw new ServiceError('bad_request', 'value is required');
    }
    const options = this.habit.settings.options;
    if (options.length > 0 && !options.includes(body.value)) {
      throw new ServiceError('bad_request', 'invalid option');
    }

    this.repository.applyHabitMutation({
      kind: 'set_select',
      user,
      habit: this.habit.name,
      date,
      value: body.value,
    });
  }

  buildPatchResponse({
    data,
    date,
    result,
    interimHabit,
  }: BuildPatchResponseInput): PatchHabitResponseFor<HabitRowSingleSelect> {
    this.singleSelectHabit(interimHabit);
    if (result.type !== 'single_select') {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }

    return {
      user: data.user,
      date,
      habit: result.name,
      type: result.type,
      details: result.details,
      ...(result.widgets ? { widgets: result.widgets } : {}),
    };
  }

  private singleSelectHabit(interimHabit: InterimHabit): InterimSingleSelectHabit {
    if (interimHabit.type !== 'single_select' || interimHabit.config.name !== this.habit.name) {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }
    return interimHabit;
  }
}
