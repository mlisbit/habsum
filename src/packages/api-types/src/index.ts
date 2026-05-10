/** JSON error body for 4xx/5xx responses that include `{ error: string }` */
export type ApiErrorBody = { error: string };

export type HealthResponse = { ok: true };

export type ListUsersResponse = { users: string[] };

export type {
  Habit,
  HabitHistory,
  HabitRowSingleSelect,
  HabitRowSummation,
  HabitsResponse,
  PatchHabitResponse,
  SummationEvent,
  SummationEventCreatedAt,
  SummationOptions,
} from './habit.js';
export type { HistoryGetResponse } from './history-get.js';
export type { UsersPatchRequest } from './users-patch.js';

export type UserConfigGetResponse = { text: string };

export type UserConfigPutResponse = { ok: true; user: string };

export type PurgeUserDataResponse = { ok: true; user: string };
