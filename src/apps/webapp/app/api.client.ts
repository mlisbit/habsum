import type {
  Habit,
  HabitDetailResponse,
  HabitsResponse,
  ListUsersResponse,
  PatchHabitResponse,
  PurgeUserDataResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
  UsersPatchRequest,
} from '@habsum/api-types';

export type {
  ApiErrorBody,
  Habit,
  HabitHistory,
  HabitRowSingleSelect,
  HabitRowSummation,
  HabitsResponse,
  HealthResponse,
  ListUsersResponse,
  PatchHabitResponse,
  PurgeUserDataResponse,
  UserConfigGetResponse,
  UserConfigPutResponse,
} from '@habsum/api-types';

const OVERRIDE_SERVER_URL = import.meta.env.VITE_HABSUM_SERVER_URL;
const API_PREFIX = OVERRIDE_SERVER_URL ? '' : '/api';
const SERVER_URL = OVERRIDE_SERVER_URL ?? '';

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

export async function getHabitDetail(user: string, habitId: string) {
  const qs = `?habitId=${encodeURIComponent(habitId)}`;
  return request<HabitDetailResponse>(`/users/${encodeURIComponent(user)}/habits/history${qs}`);
}

export async function patchHabit(
  user: string,
  body:
    | { habit: string; total: number }
    | { habit: string; value: string }
    | { habit: string; action: 'clear' },
  opts?: { date?: string },
) {
  const qs = opts?.date ? `?date=${encodeURIComponent(opts.date)}` : '';
  const res = await request<PatchHabitResponse>(`/users/${encodeURIComponent(user)}/habits${qs}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (res.type === 'single_select') {
    return {
      name: res.habit,
      type: res.type,
      options: res.options,
      value: res.value ?? null,
      goal: null,
    } satisfies Habit;
  }
  return {
    name: res.habit,
    total: res.total ?? null,
    type: res.type,
    goal: res.goal,
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
