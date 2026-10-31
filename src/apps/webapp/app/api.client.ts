import type { ApplicationUpdatesGetResponse } from '@habsum/types/api-responses/application-updates-get';
import type { Habit } from '@habsum/types/common/habit';
import type {
  AdministratorApplicationSettings,
  AdministratorApplicationSettingsPutRequest,
} from '@habsum/types/api-responses/administrator-application-settings';
import type { ApplicationGetResponse } from '@habsum/types/api-responses/application-get';
import type {
  AdministratorDatabaseDeleteRequest,
  AdministratorDatabaseDeleteResponse,
} from '@habsum/types/api-responses/administrator-database';
import type {
  AdministratorEmailSettingsPutRequest,
  AdministratorEmailSettingsResponse,
  AdministratorEmailTestRequest,
  AdministratorEmailTestResponse,
} from '@habsum/types/api-responses/administrator-email-settings';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { HabitPatch, PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
import type { HistoryGetResponse } from '@habsum/types/api-responses/history-get';
import type {
  InitialUserPostRequest,
  InitialUserPostResponse,
} from '@habsum/types/api-responses/initial-user-post';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import type {
  UserDemoAccountPutRequest,
  UserDemoAccountPutResponse,
} from '@habsum/types/api-responses/user-demo-account-put';
import type {
  UserInviteEmailPostRequest,
  UserInviteEmailPostResponse,
} from '@habsum/types/api-responses/user-invite-email-post';
import type { UsernameAvailabilityGetResponse } from '@habsum/types/api-responses/username-availability-get';
import type {
  UserPasswordChangeRequest,
  UserPasswordChangeResponse,
} from '@habsum/types/api-responses/user-password-change';
import type { SecurityGetResponse } from '@habsum/types/api-responses/security-get';
import type {
  SecuritySessionDeleteResponse,
  SecuritySessionsDeleteOthersResponse,
} from '@habsum/types/api-responses/security-delete';
import type {
  AdminResetUserPasswordResponse,
  CreateUserRequest,
  CreateUserResponse,
  ListUsersResponse,
  LoginUserResponse,
  LogoutResponse,
  UserConfigDeletion,
  UserConfigGetResponse,
  UserConfigJson,
  UserConfigMigration,
  UserConfigPutRequest,
  UserConfigPutResponse,
  YAMLString,
} from '@habsum/types/common/misc';
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from '@habsum/types/api-responses/forgot-password-post';
import type { ResetPasswordValidateResponse } from '@habsum/types/api-responses/reset-password-get';
import type { SignupRequest, SignupResponse } from '@habsum/types/api-responses/signup-post';
import type {
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '@habsum/types/api-responses/reset-password-post';
import type {
  CreateOucSessionResponse,
  OucLoginResponse,
} from '@habsum/types/api-responses/ouc-post';
import { toDateKey, toDateKeyWithTime } from '@habsum/utils/date';
import { oucSessionRequestHeaders, clearOucSessionToken } from '~/ouc.client';
import { WEBAPP_VERSION } from '~/version';

export type {
  ApiErrorBody,
  AdminResetUserPasswordResponse,
  ConfigHabitDraft,
  CreateUserResponse,
  HealthResponse,
  HistoryDisplay,
  HistoryPeriodUnit,
  ListUsersResponse,
  LoginUserResponse,
  LogoutResponse,
  ServerTimeResponse,
  UserConfigDeletion,
  UserConfigGetResponse,
  UserConfigJson,
  UserConfigJsonHabit,
  UserConfigMigration,
  UserConfigPutRequest,
  UserConfigPutResponse,
  YAMLString,
} from '@habsum/types/common/misc';
export type {
  Habit,
  HabitHistory,
  HabitWidget,
  HabitRowSingleSelect,
  HabitRowSummation,
  HabitRowText,
  SummationEvent,
  SummationEventCreatedAt,
  SummationOptions,
} from '@habsum/types/common/habit';
export type { BarGraphData, BarGraphDatum } from '@habsum/types/common/bar-chart';
export type { Day } from '@habsum/types/common/day';
export type { LongestStreak, StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
export type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
export type { HabitPatch, PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
export type { HistoryGetResponse } from '@habsum/types/api-responses/history-get';
export type {
  SecurityGetResponse,
  SecurityGetSession,
} from '@habsum/types/api-responses/security-get';
export type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
export type {
  UserPasswordChangeRequest,
  UserPasswordChangeResponse,
} from '@habsum/types/api-responses/user-password-change';
export type { ApplicationGetResponse } from '@habsum/types/api-responses/application-get';
export type {
  AdministratorDatabaseDeleteRequest,
  AdministratorDatabaseDeleteResponse,
} from '@habsum/types/api-responses/administrator-database';
export type {
  AdministratorEmailSettingsPutRequest,
  AdministratorEmailSettingsResponse,
  AdministratorEmailTestRequest,
  AdministratorEmailTestResponse,
} from '@habsum/types/api-responses/administrator-email-settings';
export type {
  MeGetResponse,
  MeGetLoggedIn,
  MeGetLoggedOut,
} from '@habsum/types/api-responses/me-get';

const OVERRIDE_SERVER_URL = import.meta.env.VITE_HABSUM_SERVER_URL;
const API_PREFIX = OVERRIDE_SERVER_URL ? '' : '/api';
const SERVER_URL = OVERRIDE_SERVER_URL ?? '';
const pendingGetRequests = new Map<string, Promise<unknown>>();

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

/** True for HTTP 5xx responses and network-level fetch failures. */
export function isServerConnectionFailure(error: unknown): boolean {
  if (error instanceof ApiRequestError) return error.status >= 500;
  return error instanceof TypeError;
}

function buildHabitPatchPayload(body: HabitPatch, date: string): Record<string, unknown> {
  const d = new Date();
  const tzOffsetMinutes = d.getTimezoneOffset();
  const clientCreatedAt = toDateKeyWithTime(d, tzOffsetMinutes);
  return {
    ...body,
    date,
    today: toDateKey(d, tzOffsetMinutes),
    clientCreatedAt,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${API_PREFIX}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-habsum-web-version': WEBAPP_VERSION,
      ...oucSessionRequestHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  const bodyText = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    let body: unknown;
    try {
      body = JSON.parse(bodyText) as unknown;
      if (
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof body.error === 'string'
      ) {
        message = body.error;
      }
    } catch {
      body = bodyText || undefined;
      if (bodyText) message = bodyText;
    }
    throw new ApiRequestError(res.status, message, body);
  }
  return (bodyText ? (JSON.parse(bodyText) as T) : ({} as T)) as T;
}

function getRequest<T>(path: string): Promise<T> {
  const pending = pendingGetRequests.get(path);
  if (pending) return pending as Promise<T>;

  const next = request<T>(path).finally(() => {
    if (pendingGetRequests.get(path) === next) pendingGetRequests.delete(path);
  });
  pendingGetRequests.set(path, next);
  return next;
}

export async function getAuthMe() {
  return getRequest<MeGetResponse>('/users/me');
}

export async function createInitialUser(username: string, password: string) {
  return request<InitialUserPostResponse>('/auth/initial-user', {
    method: 'POST',
    body: JSON.stringify({ username, password } satisfies InitialUserPostRequest),
  });
}

export async function signupUser(email: string, password: string) {
  return request<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password } satisfies SignupRequest),
  });
}

export async function requestForgotPassword(email: string) {
  return request<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email } satisfies ForgotPasswordRequest),
  });
}

export async function validateResetPasswordToken(token: string) {
  const qs = `?token=${encodeURIComponent(token)}`;
  return getRequest<ResetPasswordValidateResponse>(`/auth/reset-password${qs}`);
}

export async function submitResetPassword(body: ResetPasswordRequest) {
  return request<ResetPasswordResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function logout() {
  return request<LogoutResponse>('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
}

export async function logoutOuc() {
  await request<LogoutResponse>('/auth/ouc/logout', { method: 'POST', body: JSON.stringify({}) });
  clearOucSessionToken();
}

export async function listUsers() {
  return getRequest<ListUsersResponse>('/users');
}

export async function createOucSession(name: string) {
  return request<CreateOucSessionResponse>(`/users/ouc?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function loginWithOucToken(token: string) {
  return request<OucLoginResponse>('/auth/ouc', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function getApplicationUpdates(webVersion: string) {
  return getRequest<ApplicationUpdatesGetResponse>(
    `/application/updates?webVersion=${encodeURIComponent(webVersion)}`,
  );
}

export async function getApplication() {
  return getRequest<ApplicationGetResponse>('/application');
}

export async function downloadAdministratorDatabase(): Promise<Blob> {
  const res = await fetch(`${SERVER_URL}${API_PREFIX}/administrator/database/download`, {
    credentials: 'include',
    headers: {
      'x-habsum-web-version': WEBAPP_VERSION,
      ...oucSessionRequestHeaders(),
    },
  });
  if (!res.ok) {
    const bodyText = await res.text();
    let message = res.statusText;
    try {
      const body = JSON.parse(bodyText) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      if (bodyText) message = bodyText;
    }
    throw new ApiRequestError(res.status, message);
  }
  return res.blob();
}

export async function deleteAdministratorDatabase(confirmation: string) {
  const body: AdministratorDatabaseDeleteRequest = { confirmation };
  return request<AdministratorDatabaseDeleteResponse>('/administrator/database', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
}

export async function getAdministratorEmailSettings() {
  return getRequest<AdministratorEmailSettingsResponse>('/administrator/email-settings');
}

export async function updateAdministratorEmailSettings(body: AdministratorEmailSettingsPutRequest) {
  return request<AdministratorEmailSettingsResponse>('/administrator/email-settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function sendAdministratorTestEmail(body: AdministratorEmailTestRequest) {
  return request<AdministratorEmailTestResponse>('/administrator/email-settings/test', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getAdministratorApplicationSettings() {
  return getRequest<AdministratorApplicationSettings>('/administrator/application-settings');
}

export async function updateAdministratorApplicationSettings(
  body: AdministratorApplicationSettingsPutRequest,
) {
  return request<AdministratorApplicationSettings>('/administrator/application-settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function createUser(body: CreateUserRequest) {
  return request<CreateUserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getUsernameAvailability(username: string) {
  return getRequest<UsernameAvailabilityGetResponse>(
    `/users/username-availability?username=${encodeURIComponent(username)}`,
  );
}

export async function sendUserInviteEmail(user: string, registrationUrl: string) {
  const body: UserInviteEmailPostRequest = { registrationUrl };
  return request<UserInviteEmailPostResponse>(
    `/users/invite-email?name=${encodeURIComponent(user)}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function adminResetUserPassword(name: string) {
  const qs = `?name=${encodeURIComponent(name)}`;
  return request<AdminResetUserPasswordResponse>(`/users${qs}`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function adminSetUserDemoAccount(name: string, demoUser: boolean) {
  const body: UserDemoAccountPutRequest = { demoUser };
  return request<UserDemoAccountPutResponse>(
    `/users/demo-account?name=${encodeURIComponent(name)}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export async function adminDeleteUser(name: string) {
  const qs = `?name=${encodeURIComponent(name)}`;
  return request<{ ok: true; user: string }>(`/users${qs}`, { method: 'DELETE' });
}

export async function loginUser(user: string, password: string) {
  return request<LoginUserResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user, password }),
  });
}

export async function getUserSecurity(user: string) {
  return getRequest<SecurityGetResponse>(`/users/${encodeURIComponent(user)}/security`);
}

export async function revokeUserSecuritySession(user: string, token: string) {
  return request<SecuritySessionDeleteResponse>(
    `/users/${encodeURIComponent(user)}/security/sessions/${encodeURIComponent(token)}`,
    { method: 'DELETE' },
  );
}

export async function revokeOtherUserSecuritySessions(user: string) {
  return request<SecuritySessionsDeleteOthersResponse>(
    `/users/${encodeURIComponent(user)}/security/sessions`,
    { method: 'DELETE' },
  );
}

export async function patchUser(user: string, body: UsersPatchRequest) {
  return request<{ ok: true; username: string }>(`/users/${encodeURIComponent(user)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function changeUserPassword(user: string, body: UserPasswordChangeRequest) {
  return request<UserPasswordChangeResponse>(`/users/${encodeURIComponent(user)}/password`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteUser(user: string) {
  return request<{ ok: true; username: string }>(`/users/${encodeURIComponent(user)}`, {
    method: 'DELETE',
  });
}

export async function getHabits(user: string, date?: string) {
  const now = new Date();
  const tzOffsetMinutes = now.getTimezoneOffset();
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  params.set('today', toDateKey(now, tzOffsetMinutes));
  params.set('clientHour', String(now.getHours()));
  const qs = `?${params.toString()}`;
  return getRequest<HabitsResponse>(`/users/${encodeURIComponent(user)}/habits${qs}`);
}

export async function getHabitHistory(user: string, filter: string[], date?: string) {
  const now = new Date();
  const tzOffsetMinutes = now.getTimezoneOffset();
  const params = new URLSearchParams();
  params.set('filter', filter.join(','));
  if (date) params.set('date', date);
  params.set('today', toDateKey(now, tzOffsetMinutes));
  const qs = `?${params.toString()}`;
  const path = `/users/${encodeURIComponent(user)}/habits/history${qs}`;
  return getRequest<HistoryGetResponse>(path);
}

export async function patchHabit(user: string, body: HabitPatch, opts: { date: string }) {
  const res = await request<PatchHabitResponse>(`/users/${encodeURIComponent(user)}/habits`, {
    method: 'PATCH',
    body: JSON.stringify(buildHabitPatchPayload(body, opts.date)),
  });
  if (res.type === 'single_select') {
    return {
      name: res.habit,
      type: res.type,
      details: res.details,
      ...(res.widgets ? { widgets: res.widgets } : {}),
    } satisfies Habit;
  }
  if (res.type === 'text') {
    return {
      name: res.habit,
      type: res.type,
      details: res.details,
      ...(res.widgets ? { widgets: res.widgets } : {}),
    } satisfies Habit;
  }
  return {
    name: res.habit,
    type: res.type,
    details: res.details,
    ...(res.widgets ? { widgets: res.widgets } : {}),
  } satisfies Habit;
}

export async function getUserConfig(user: string) {
  const path = `/users/${encodeURIComponent(user)}/config`;
  return getRequest<UserConfigGetResponse>(path);
}

export async function putUserConfig(
  user: string,
  payload: { text: YAMLString } | { config: UserConfigJson },
) {
  const body: UserConfigPutRequest = payload;
  return request<UserConfigPutResponse>(`/users/${encodeURIComponent(user)}/config`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function downloadUserDataCsv(user: string): Promise<Blob> {
  const res = await fetch(`${SERVER_URL}${API_PREFIX}/users/${encodeURIComponent(user)}/data`, {
    credentials: 'include',
    headers: {
      'x-habsum-web-version': WEBAPP_VERSION,
      ...oucSessionRequestHeaders(),
    },
  });
  const bodyText = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = JSON.parse(bodyText) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      if (bodyText) message = bodyText;
    }
    throw new ApiRequestError(res.status, message);
  }
  return new Blob([bodyText], { type: 'text/csv;charset=utf-8' });
}
