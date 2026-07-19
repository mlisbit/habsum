import type { DayWithTime } from './day.js';
import type { ProductEntitlement } from './entitlement.js';
import type { SummationOptions } from './habit.js';

declare const yamlStringBrand: unique symbol;

export type YAMLString = string & { readonly [yamlStringBrand]: 'YAMLString' };

export function yamlString(value: string): YAMLString {
  return value as YAMLString;
}

/** JSON error body for 4xx/5xx responses that include `{ error: string }` */
export type ApiErrorBody = { error: string };

export type HealthResponse = { ok: true };

/** Current wall-clock info from the API process (habsum server). */
export type ServerTimeResponse = {
  iso: string;
  timezone: string;
};

export type ListUserItem = {
  username: string;
  displayName: string | null;
  email: string;
  /** Unix timestamp in seconds. `null` means `/auth/me` has never resolved for this user. */
  lastLoginAt: number | null;
  /** Last API/web version pair observed when `/auth/me` resolved for this user. */
  webAndApiVersion: string | null;
  /** Number of habits currently configured in the user's YAML. */
  habitCount: number;
  /** Number of stored habit activity rows for this user. */
  eventCount: number;
  entitlements: ProductEntitlement[];
};

export type ListUsersResponse = { users: ListUserItem[] };

/** POST /users — admin creates an account from email (server assigns username + password). */
export type CreateUserRequest = {
  email: string;
  displayName?: string | null;
  sendInviteEmail?: boolean;
};

export type CreateUserResponse = {
  ok: true;
  user: string;
  password: string;
  inviteEmailSent?: boolean;
};

/** PATCH /users?name=… — admin generates a new temporary login password. */
export type AdminResetUserPasswordResponse = { ok: true; user: string; password: string };

export type LoginUserRequest = { pin?: string };

export type LoginUserResponse = { ok: true; user: string };

export type LogoutResponse = { ok: true };

export type UserSessionResponse = {
  /** Login id; aligned with `GET /auth/me` (`MeGetLoggedIn.username`). */
  username: string;
  admin: boolean;
  displayName: string | null;
  email: string;
  theme: string | null;
  /** Account creation time as UTC day + time. */
  createdAt: DayWithTime;
  /** Same entitlement list as `GET /auth/me` (see `MeGetLoggedIn['entitlements']`). */
  entitlements: ProductEntitlement[];
};

export type UserConfigJsonHabit = {
  name: string;
  type: 'summation' | 'single_select';
  goal: number | null;
  repeat?: string[];
  options?: string[];
  theme?: string;
  summationOptions?: SummationOptions;
  history?: {
    period: string;
    displays?: HistoryDisplay[];
    display?: 'heatmap' | 'weekly_history';
  };
  streak?: {
    options: string[];
    frequency?: string;
    show_longest?: boolean;
  };
};

export type UserConfigJson = {
  user: string;
  includeAbsentDaysInAverage: boolean;
  habits: UserConfigJsonHabit[];
};

export type UserConfigGetResponse = {
  text: YAMLString;
  config: UserConfigJson;
};

export type UserConfigMigration = [from: string, to: string];
export type UserConfigDeletion = string;

export type UserConfigPutRequest = {
  text?: YAMLString;
  config?: UserConfigJson;
  migrations?: UserConfigMigration[];
  deletions?: UserConfigDeletion[];
};

export type UserConfigPutResponse = { ok: true; user: string };

export type HistoryPeriodUnit = 'd' | 'w';
export type HistoryDisplay = 'heatmap' | 'weekly_history';

export type ConfigHabitDraft = {
  name: string;
  type: 'summation' | 'single_select';
  goal: string;
  repeat: string[];
  quickAddItems: string[];
  optionsText: string;
  theme: string;
  streakEnabled: boolean;
  streakOptionsText: string;
  streakFrequencyPerWeek: string;
  streakShowLongest: boolean;
  historyEnabled: boolean;
  historyDisplays: HistoryDisplay[];
  historyPeriodAmount: string;
  historyPeriodUnit: HistoryPeriodUnit;
};

export type PurgeUserDataResponse = { ok: true; user: string };
