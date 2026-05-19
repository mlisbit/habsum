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
  CreateUserResponse,
  ListUsersResponse,
  LoginUserResponse,
  LogoutResponse,
  PurgeUserDataResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
  UserSessionResponse,
} from '@habsum/types/common/misc';
import { toDateKeyWithTime } from '@habsum/utils';

export type {
  ApiErrorBody,
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

function buildHabitPatchPayload(
  body:
    | { habit: string; total: number }
    | { habit: string; value: string }
    | { habit: string; action: 'clear' }
    | { habit: string; action: 'delete_event'; eventId: number },
  date: string,
): Record<string, unknown> {
  const d = new Date();
  const clientCreatedAt = toDateKeyWithTime(d, d.getTimezoneOffset());
  return {
    ...body,
    date,
    clientCreatedAt,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${API_PREFIX}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'content-type': 'application/json',
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
    throw new Error(message);
  }
  return (bodyText ? (JSON.parse(bodyText) as T) : ({} as T)) as T;
}

export async function getAuthMe() {
  return request<MeGetResponse>('/auth/me');
}

export async function logout() {
  return request<LogoutResponse>('/logout', { method: 'POST', body: JSON.stringify({}) });
}

export async function listUsers() {
  return request<ListUsersResponse>('/users');
}

export async function getDeveloper() {
  return request<DeveloperGetResponse>('/developer');
}

export async function createUser(name: string, pin: string) {
  const qs = `?name=${encodeURIComponent(name)}`;
  return request<CreateUserResponse>(`/users${qs}`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export async function adminSetUserLoginPin(name: string, pin: string) {
  const qs = `?name=${encodeURIComponent(name)}`;
  return request<{ ok: true; user: string }>(`/users${qs}`, {
    method: 'PATCH',
    body: JSON.stringify({ pin }),
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
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
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
    { method: 'DELETE', credentials: 'include' },
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as PurgeUserDataResponse;
}
