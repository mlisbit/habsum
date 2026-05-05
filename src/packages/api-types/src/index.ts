/** JSON error body for 4xx/5xx responses that include `{ error: string }` */
export type ApiErrorBody = { error: string };

export type HealthResponse = { ok: true };

export type ListUsersResponse = { users: string[] };

export type { HistoryGetResponse } from './history-get.js';
export type { UsersPatchRequest } from './users-patch.js';

export type HabitHistory = {
  display: 'average';
  data: { user: (number | null)[] };
};

/** A single-select row from `GET /users/:user/habits` */
export type HabitRowSingleSelect = {
  name: string;
  type: 'single_select';
  goal: number | null;
  options: string[];
  value: string | null;
  history?: HabitHistory;
};

/** Parsed from YAML `summation_options` for summation habits. */
export type SummationOptions = {
  add: number;
  sub: number;
  /** True when config is `[sub, input, add]` — − uses `sub`, middle field sets + amount (defaults to `add`). */
  inputBetween?: boolean;
};

export type SummationEvent = {
  id: number;
  date: string;
  amount: number;
  createdAt: string;
};

/** A summation row from `GET /users/:user/habits` */
export type HabitRowSummation = {
  name: string;
  type: 'summation';
  goal: number | null;
  /** Logged total for the requested day; `null` means no row stored (distinct from explicit `0`). */
  total: number | null;
  /** Individual events for detail views. Omitted from list views. */
  events?: SummationEvent[];
  /** Fixed +/− amounts from config (`summation_options`); omit for free-form count control. */
  summationOptions?: SummationOptions;
  history?: HabitHistory;
};

/**
 * A habit as returned from `GET /users/:user/habits` and normalized from
 * `PATCH` on the client.
 */
export type Habit = HabitRowSingleSelect | HabitRowSummation;

export type HabitsResponse = {
  user: string;
  date: string;
  firstDate: string | null;
  habits: Habit[];
  serverTime: string;
};

export type PatchHabitResponse =
  | {
      user: string;
      date: string;
      habit: string;
      value: string | null;
      type: 'single_select';
      options: string[];
    }
  | {
      user: string;
      date: string;
      habit: string;
      total: number | null;
      events?: SummationEvent[];
      type: 'summation';
      goal: number | null;
    };

export type UserConfigGetResponse = { text: string };

export type UserConfigPutResponse = { ok: true; user: string };

export type PurgeUserDataResponse = { ok: true; user: string };
