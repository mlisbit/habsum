import type { DayWithTime } from './day.js';
import type { ProductEntitlement } from './entitlement.js';
import type { HabitTheme, SingleSelectOption, SummationOptions } from './habit.js';

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
  /** Unix timestamp in seconds. `null` means `/users/me` has never resolved for this user. */
  lastLoginAt: number | null;
  /** Last API/web version pair observed when `/users/me` resolved for this user. */
  webAndApiVersion: string | null;
  /** Number of habits currently configured in the user's YAML. */
  habitCount: number;
  /** Number of stored habit activity rows for this user. */
  eventCount: number;
  entitlements: ProductEntitlement[];
};

export type ListUsersResponse = { users: ListUserItem[] };

/** POST /users — admin creates an account with a username, email, or both. */
export type CreateUserRequest = {
  displayName?: string;
  email?: string;
  username?: string;
};

export type CreateUserField = keyof CreateUserRequest;

export type CreateUserFieldErrors = Partial<Record<CreateUserField, string>>;

export type CreateUserValidationResult = {
  request: CreateUserRequest;
  errors: CreateUserFieldErrors;
};

export type CreateUserResponse = {
  ok: true;
  user: string;
  password: string;
  email?: string;
  registrationUrl: string;
};

/** PATCH /users?name=… — admin generates a new temporary login password. */
export type AdminResetUserPasswordResponse = { ok: true; user: string; password: string };

export type LoginUserRequest = { user?: string; password?: string };

export type LoginUserResponse = { ok: true; user: string };

export type LogoutResponse = { ok: true };

export type UserConfigJsonHabit = {
  name: string;
  type: 'summation' | 'single_select' | 'text';
  goal: number | null;
  repeat?: string[];
  /** Text-habit weekdays that start a fresh note window. Omitted means every day. */
  reset?: string[];
  options?: SingleSelectOption[];
  theme?: HabitTheme;
  summationOptions?: SummationOptions;
  data_visualization?: {
    heatmap?: Record<string, never> | null;
    bargraph?: { period: string } | null;
  };
  insights?: Array<'average' | 'current_streak' | 'longest_streak'>;
  streak_options?: {
    frequency: string;
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
  type: 'summation' | 'single_select' | 'text';
  goal: string;
  repeat: string[];
  reset: string[];
  quickAddItems: string[];
  options: SingleSelectOption[];
  theme: HabitTheme | '';
  averageEnabled: boolean;
  streakFrequencyPerWeek: string;
  streakShowCurrent: boolean;
  streakShowLongest: boolean;
  historyEnabled: boolean;
  historyDisplays: HistoryDisplay[];
  historyPeriodAmount: string;
  historyPeriodUnit: HistoryPeriodUnit;
};

export type PurgeUserDataResponse = { ok: true; user: string };
