import type { Habit } from '@habsum/types/common/habit';
import type { DeveloperGetResponse } from '@habsum/types/api-responses/developer-get';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
import type { HistoryGetResponse } from '@habsum/types/api-responses/history-get';
import type { UsersPatchRequest } from '@habsum/types/api-responses/users-patch';
import type {
  UserPasswordChangeRequest,
  UserPasswordChangeResponse,
} from '@habsum/types/api-responses/user-password-change';
import type {
  UserNewPasswordRequest,
  UserNewPasswordResponse,
} from '@habsum/types/api-responses/user-new-password';
import type { SecurityGetResponse } from '@habsum/types/api-responses/security-get';
import type {
  SecuritySessionDeleteResponse,
  SecuritySessionsDeleteOthersResponse,
} from '@habsum/types/api-responses/security-delete';
import type {
  AdminResetUserPasswordResponse,
  CreateUserResponse,
  ListUsersResponse,
  LoginUserResponse,
  LogoutResponse,
  PurgeUserDataResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
  UserSessionResponse,
} from '@habsum/types/common/misc';
import type {
  CreateOucSessionResponse,
  OucLoginResponse,
} from '@habsum/types/api-responses/ouc-post';
import { toDateKeyWithTime } from '@habsum/utils';
import { oucSessionRequestHeaders, clearOucSessionToken } from '~/ouc.client';

export type {
  ApiErrorBody,
  AdminResetUserPasswordResponse,
  CreateUserResponse,
  HealthResponse,
  ListUsersResponse,
  LoginUserResponse,
  LogoutResponse,
  PurgeUserDataResponse,
  ServerTimeResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
  UserSessionResponse,
} from '@habsum/types/common/misc';
export type {
  Habit,
  HabitHistory,
  HabitRowSingleSelect,
  HabitRowSummation,
  SummationEvent,
  SummationEventCreatedAt,
  SummationOptions,
} from '@habsum/types/common/habit';
export type { BarGraphData, BarGraphDatum } from '@habsum/types/common/bar-chart';
export type { Day } from '@habsum/types/common/day';
export type { StreakDatum, StreakGraphData } from '@habsum/types/common/streak';
export type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
export type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
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
export type { DeveloperGetResponse } from '@habsum/types/api-responses/developer-get';
export type {
  MeGetResponse,
  MeGetLoggedIn,
  MeGetLoggedOut,
} from '@habsum/types/api-responses/me-get';

const OVERRIDE_SERVER_URL = import.meta.env.VITE_HABSUM_SERVER_URL;
const API_PREFIX = OVERRIDE_SERVER_URL ? '' : '/api';
const SERVER_URL = OVERRIDE_SERVER_URL ?? '';
const habitHistoryRequests = new Map<string, Promise<HistoryGetResponse>>();

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

/** True for HTTP 5xx responses and network-level fetch failures. */
export function isServerConnectionFailure(error: unknown): boolean {
  if (error instanceof ApiRequestError) return error.status >= 500;
  return error instanceof TypeError;
}

function buildHabitPatchPayload(
  body:
    | { habit: string; total: number }
    | { habit: string; value: string }
    | { habit: string; action: 'clear' }
    | { habit: string; action: 'delete_event'; eventId: number },
  date: string,
): Record<string, unknown> {
  const d = new Date();
  const tzOffsetMinutes = d.getTimezoneOffset();
  const clientCreatedAt = toDateKeyWithTime(d, tzOffsetMinutes);
  return {
    ...body,
    date,
    clientCreatedAt,
    tzOffsetMinutes,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${API_PREFIX}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...oucSessionRequestHeaders(),
      ...(init?.headers ?? {}),
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
  return (bodyText ? (JSON.parse(bodyText) as T) : ({} as T)) as T;
}

export async function getAuthMe() {
  return request<MeGetResponse>('/auth/me');
}

export async function logout() {
  return request<LogoutResponse>('/logout', { method: 'POST', body: JSON.stringify({}) });
}

export async function logoutOuc() {
  await request<LogoutResponse>('/auth/ouc/logout', { method: 'POST', body: JSON.stringify({}) });
  clearOucSessionToken();
}

export async function listUsers() {
  return request<ListUsersResponse>('/users');
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

export async function getDeveloper() {
  return request<DeveloperGetResponse>('/developer');
}

export async function createUser(email: string) {
  return request<CreateUserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function adminResetUserPassword(name: string) {
  const qs = `?name=${encodeURIComponent(name)}`;
  return request<AdminResetUserPasswordResponse>(`/users${qs}`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function adminDeleteUser(name: string) {
  const qs = `?name=${encodeURIComponent(name)}`;
  return request<{ ok: true; user: string }>(`/users${qs}`, { method: 'DELETE' });
}

export async function loginUser(user: string, pin: string) {
  return request<LoginUserResponse>(`/users/${encodeURIComponent(user)}/login`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export async function getUserSession(user: string) {
  return request<UserSessionResponse>(`/users/${encodeURIComponent(user)}/session`);
}

export async function getUserSecurity(user: string) {
  return request<SecurityGetResponse>(`/users/${encodeURIComponent(user)}/security`);
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

export async function setUserNewPassword(user: string, body: UserNewPasswordRequest) {
  return request<UserNewPasswordResponse>(`/users/${encodeURIComponent(user)}/new-password`, {
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
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  params.set('tzOffsetMinutes', String(new Date().getTimezoneOffset()));
  const qs = `?${params.toString()}`;
  return request<HabitsResponse>(`/users/${encodeURIComponent(user)}/habits${qs}`);
}

export async function getHabitHistory(user: string, filter: string[], date?: string) {
  const params = new URLSearchParams();
  params.set('filter', filter.join(','));
  if (date) params.set('date', date);
  const qs = `?${params.toString()}`;
  const path = `/users/${encodeURIComponent(user)}/habits/history${qs}`;
  const pending = habitHistoryRequests.get(path);
  if (pending) return pending;

  const next = request<HistoryGetResponse>(path).finally(() => {
    habitHistoryRequests.delete(path);
  });
  habitHistoryRequests.set(path, next);
  return next;
}

export async function patchHabit(
  user: string,
  body:
    | { habit: string; total: number }
    | { habit: string; value: string }
    | { habit: string; action: 'clear' }
    | { habit: string; action: 'delete_event'; eventId: number },
  opts: { date: string },
) {
  const res = await request<PatchHabitResponse>(`/users/${encodeURIComponent(user)}/habits`, {
    method: 'PATCH',
    body: JSON.stringify(buildHabitPatchPayload(body, opts.date)),
  });
  if (res.type === 'single_select') {
    return {
      name: res.habit,
      type: res.type,
      options: res.options,
      value: res.value ?? null,
      goal: null,
      ...(res.streak ? { streak: res.streak } : {}),
    } satisfies Habit;
  }
  return {
    name: res.habit,
    total: res.total ?? null,
    type: res.type,
    goal: res.goal,
    ...(res.events ? { events: res.events } : {}),
    ...(res.history ? { history: res.history } : {}),
  } satisfies Habit;
}

export async function getUserConfig(user: string) {
  return request<UserConfigGetResponse>(`/users/${encodeURIComponent(user)}/config`);
}

export async function putUserConfig(user: string, text: string) {
  return request<UserConfigPutResponse>(`/users/${encodeURIComponent(user)}/config`, {
    method: 'PUT',
    body: JSON.stringify({ text }),
  });
}

export async function purgeUserData(user: string) {
  const qs = '';
  const res = await fetch(
    `${SERVER_URL}${API_PREFIX}/users/${encodeURIComponent(user)}/data${qs}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: oucSessionRequestHeaders(),
    },
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as PurgeUserDataResponse;
}
