import type { HabitRowSingleSelect } from '@habsum/types/common/habit';
import ServiceError from '../../utils/classes/service-error.js';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import type {
  ApplyHabitPatchInput,
  BuildPatchResponseInput,
  HabitMutationRepository,
  HabitTypeService,
  PatchHabitResponseFor,
} from './habit-type-service.js';

type HydratedSingleSelectData = Extract<HydratedHabitData, { type: 'single_select' }>;

export class SingleSelectHabitService implements HabitTypeService<HabitRowSingleSelect> {
  constructor(
    readonly habit: HabitDef<'single_select'>,
    private readonly repository: HabitMutationRepository,
  ) {}

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
    habitData,
  }: BuildPatchResponseInput): PatchHabitResponseFor<HabitRowSingleSelect> {
    this.singleSelectData(habitData);
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

  private singleSelectData(habitData: HydratedHabitData): HydratedSingleSelectData {
    if (habitData.type !== 'single_select' || habitData.name !== this.habit.name) {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }
    return habitData;
  }
}
