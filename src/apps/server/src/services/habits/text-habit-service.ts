import type { HabitRowText } from '@habsum/types/common/habit';
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

type HydratedTextData = Extract<HydratedHabitData, { type: 'text' }>;

export class TextHabitService implements HabitTypeService<HabitRowText> {
  constructor(
    readonly habit: HabitDef<'text'>,
    private readonly repository: HabitMutationRepository,
  ) {}

  applyPatch({ user, date, body }: ApplyHabitPatchInput): void {
    const action = typeof body.action === 'string' ? body.action : undefined;
    if (action === 'clear') {
      this.repository.applyHabitMutation({
        kind: 'clear_text',
        user,
        habit: this.habit.name,
        date,
      });
      return;
    }
    if (action != null) {
      throw new ServiceError('bad_request', `unknown action "${action}"`);
    }
    if (typeof body.text !== 'string') {
      throw new ServiceError('bad_request', 'text is required');
    }
    if (body.text.length === 0) {
      this.repository.applyHabitMutation({
        kind: 'clear_text',
        user,
        habit: this.habit.name,
        date,
      });
      return;
    }

    this.repository.applyHabitMutation({
      kind: 'set_text',
      user,
      habit: this.habit.name,
      date,
      text: body.text,
    });
  }

  buildPatchResponse({
    user,
    date,
    result,
    habitData,
  }: BuildPatchResponseInput): PatchHabitResponseFor<HabitRowText> {
    this.textData(habitData);
    if (result.type !== 'text') {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }

    return {
      user,
      date,
      habit: result.name,
      type: result.type,
      details: result.details,
    };
  }

  private textData(habitData: HydratedHabitData): HydratedTextData {
    if (habitData.type !== 'text' || habitData.name !== this.habit.name) {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }
    return habitData;
  }
}
