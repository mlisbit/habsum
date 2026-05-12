/** JSON error body for 4xx/5xx responses that include `{ error: string }` */
export type ApiErrorBody = { error: string };

export type HealthResponse = { ok: true };

/** Current wall-clock info from the API process (habsum server). */
export type ServerTimeResponse = {
  iso: string;
  timezone: string;
};

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
