import type { Day } from '@habsum/types/common/day';
import type { HabitRowSummation } from '@habsum/types/common/habit';
import { ServiceError } from '../../service-error.js';
import { parseClientCreatedAtIso } from '../../server-time.js';
import { mapSummationEventsToApi } from '../../summation-event-api.js';
import type { HydratedHabitData } from '../../types/habit.types.js';
import type { HabitDef } from '../../types/userConfig.js';
import type {
  ApplyHabitPatchInput,
  BuildPatchResponseInput,
  HabitMutationRepository,
  HabitTypeService,
  PatchHabitResponseFor,
} from './habit-type-service.js';

type HydratedSummationData = Extract<HydratedHabitData, { type: 'summation' }>;

export class SummationHabitService implements HabitTypeService<HabitRowSummation> {
  constructor(
    readonly habit: HabitDef<'summation'>,
    private readonly repository: HabitMutationRepository,
  ) {}

  historyDates(habitData: HydratedHabitData): Day[] {
    return this.summationData(habitData).totals.map((row) => row.date);
  }

  historyHabit(habitData: HydratedHabitData, date: Day): HabitRowSummation {
    const typedHabit = this.summationData(habitData);
    const emptyHabit = this.emptyHistoryHabit();
    return {
      ...emptyHabit,
      details: {
        ...emptyHabit.details,
        total: typedHabit.totals.find((row) => row.date === date)?.total ?? null,
        events: mapSummationEventsToApi(typedHabit.events.filter((event) => event.date === date)),
      },
    };
  }

  emptyHistoryHabit(): HabitRowSummation {
    return {
      name: this.habit.name,
      type: 'summation',
      details: {
        goal: this.habit.settings.goal,
        total: null,
        events: [],
        ...(this.habit.settings.summationOptions
          ? { summationOptions: this.habit.settings.summationOptions }
          : {}),
      },
    };
  }

  applyPatch({ user, date, body }: ApplyHabitPatchInput): void {
    const action = typeof body.action === 'string' ? body.action : 'add';

    if (action === 'delete_event') {
      const eventId = typeof body.eventId === 'number' ? body.eventId : Number(body.eventId);
      if (!Number.isInteger(eventId) || eventId <= 0) {
        throw new ServiceError('bad_request', 'eventId is required (positive integer)');
      }
      const removed = this.repository.applyHabitMutation({
        kind: 'delete_event',
        user,
        habit: this.habit.name,
        date,
        eventId,
      });
      if (!removed) {
        throw new ServiceError('not_found', 'summation event not found');
      }
      return;
    }

    if (action === 'clear') {
      this.repository.applyHabitMutation({
        kind: 'clear_total',
        user,
        habit: this.habit.name,
        date,
      });
      return;
    }

    const total = Number(body.total);
    if (!Number.isFinite(total)) {
      throw new ServiceError('bad_request', 'total must be a number');
    }

    const createdAt = parseClientCreatedAtIso(body.clientCreatedAt);
    if (createdAt == null) {
      throw new ServiceError(
        'bad_request',
        'body.clientCreatedAt is required for summation add/set (YYYY-MM-DD HH:MM:SS client wall clock)',
      );
    }

    if (action !== 'add' && action !== 'set') {
      throw new ServiceError('bad_request', `unknown action "${action}"`);
    }

    this.repository.applyHabitMutation({
      kind: action === 'add' ? 'add_total' : 'set_total',
      user,
      habit: this.habit.name,
      date,
      total,
      createdAt,
    });
  }

  buildPatchResponse({
    data,
    date,
    result,
    habitData,
  }: BuildPatchResponseInput): PatchHabitResponseFor<HabitRowSummation> {
    const typedHabit = this.summationData(habitData);
    if (result.type !== 'summation') {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }

    return {
      user: data.user,
      date,
      habit: result.name,
      type: result.type,
      details: {
        ...result.details,
        events: mapSummationEventsToApi(typedHabit.events.filter((event) => event.date === date)),
      },
      ...(result.widgets ? { widgets: result.widgets } : {}),
    };
  }

  private summationData(habitData: HydratedHabitData): HydratedSummationData {
    if (habitData.type !== 'summation' || habitData.name !== this.habit.name) {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }
    return habitData;
  }
}
