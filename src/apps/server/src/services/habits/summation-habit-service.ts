import type { Day } from '@habsum/types/common/day';
import type { HabitRowSummation } from '@habsum/types/common/habit';
import { ServiceError } from '../../service-error.js';
import { parseClientCreatedAtIso } from '../../server-time.js';
import { mapSummationEventsToApi } from '../../summation-event-api.js';
import type { InterimHabit } from '../../types/habit.types.js';
import type {
  ApplyHabitPatchInput,
  BuildPatchResponseInput,
  HabitDefOf,
  HabitMutationRepository,
  HabitTypeService,
  PatchHabitResponseFor,
} from './habit-type-service.js';

type InterimSummationHabit = Extract<InterimHabit, { type: 'summation' }>;

export class SummationHabitService implements HabitTypeService<HabitRowSummation> {
  constructor(
    readonly habit: HabitDefOf<'summation'>,
    private readonly repository: HabitMutationRepository,
  ) {}

  historyDates(interimHabit: InterimHabit): Day[] {
    return this.summationHabit(interimHabit).totals.map((row) => row.date);
  }

  historyHabit(interimHabit: InterimHabit, date: Day): HabitRowSummation {
    const typedHabit = this.summationHabit(interimHabit);
    return {
      ...this.emptyHistoryHabit(),
      total: typedHabit.totals.find((row) => row.date === date)?.total ?? null,
      events: mapSummationEventsToApi(typedHabit.events.filter((event) => event.date === date)),
    };
  }

  emptyHistoryHabit(): HabitRowSummation {
    return {
      name: this.habit.name,
      type: 'summation',
      goal: this.habit.goal ?? null,
      total: null,
      events: [],
      ...(this.habit.summationOptions ? { summationOptions: this.habit.summationOptions } : {}),
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
    interimHabit,
  }: BuildPatchResponseInput): PatchHabitResponseFor<HabitRowSummation> {
    const typedHabit = this.summationHabit(interimHabit);
    if (result.type !== 'summation') {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }

    return {
      user: data.user,
      date,
      habit: result.name,
      total: result.total,
      events: mapSummationEventsToApi(typedHabit.events.filter((event) => event.date === date)),
      type: result.type,
      goal: result.goal,
      ...(result.widgets ? { widgets: result.widgets } : {}),
    };
  }

  private summationHabit(interimHabit: InterimHabit): InterimSummationHabit {
    if (interimHabit.type !== 'summation' || interimHabit.config.name !== this.habit.name) {
      throw new Error(`hydrated habit type mismatch for "${this.habit.name}"`);
    }
    return interimHabit;
  }
}
