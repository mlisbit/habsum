import type { Habit } from '@habsum/api-types/common/habit';
import type { HabitsResponse } from '@habsum/api-types/api-responses/habits-get';
import type { PatchHabitResponse } from '@habsum/api-types/api-responses/habit-patch';
import type { HistoryGetResponse } from '@habsum/api-types/api-responses/history-get';
import type { UsersPatchRequest } from '@habsum/api-types/api-responses/users-patch';
import type {
  ListUsersResponse,
  PurgeUserDataResponse,
  ServerTimeResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
} from '@habsum/api-types/common/misc';
import { toDateKey } from '@habsum/utils';

export type {
  ApiErrorBody,
  HealthResponse,
  ListUsersResponse,
  PurgeUserDataResponse,
  ServerTimeResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
} from '@habsum/api-types/common/misc';
export type {
  Habit,
  HabitHistory,
  HabitRowSingleSelect,
  HabitRowSummation,
  SummationEvent,
  SummationEventCreatedAt,
  SummationOptions,
} from '@habsum/api-types/common/habit';
export type { BarGraphData, BarGraphDatum } from '@habsum/api-types/common/bar-chart';
export type { StreakDatum, StreakGraphData } from '@habsum/api-types/common/streak';
export type { HabitsResponse } from '@habsum/api-types/api-responses/habits-get';
export type { PatchHabitResponse } from '@habsum/api-types/api-responses/habit-patch';
export type { HistoryGetResponse } from '@habsum/api-types/api-responses/history-get';
export type { UsersPatchRequest } from '@habsum/api-types/api-responses/users-patch';

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
  const clientCreatedAt = toDateKey(d, d.getTimezoneOffset(), true);
  return {
    ...body,
    date,
    clientCreatedAt,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${API_PREFIX}${path}`, {
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

export async function listUsers() {
  return request<ListUsersResponse>('/users');
}

export async function getServerTime() {
  return request<ServerTimeResponse>('/time');
}

export async function createUser(name: string) {
  const qs = `?name=${encodeURIComponent(name)}`;
  return request<{ ok: true; user: string }>(`/users${qs}`, { method: 'POST' });
}

export async function patchUser(user: string, body: UsersPatchRequest) {
  return request<{ ok: true; user: string }>(`/users/${encodeURIComponent(user)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteUser(user: string) {
  return request<{ ok: true; user: string }>(`/users/${encodeURIComponent(user)}`, {
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
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as PurgeUserDataResponse;
}
