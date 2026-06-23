import type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
import type { ListUsersResponse } from '@habsum/types/common/misc';
import { toDateKeyWithTime } from '@habsum/utils/date';

const SERVER_URL = process.env.HABSUM_SERVER_URL ?? 'http://localhost:3001';

function buildHabitPatchPayload(
  body:
    | { habit: string; total: number; action?: 'add' | 'set' }
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
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Response(text || res.statusText, { status: res.status });
  }
  return (await res.json()) as T;
}

export function listUsers() {
  return request<ListUsersResponse>('/users');
}

export function getHabits(user: string) {
  return request<HabitsResponse>(`/users/${encodeURIComponent(user)}/habits`);
}

export function patchHabit(
  user: string,
  body:
    | { habit: string; total: number; action?: 'add' | 'set' }
    | { habit: string; action: 'clear' }
    | { habit: string; action: 'delete_event'; eventId: number },
  opts: { date: string },
) {
  return request<PatchHabitResponse>(`/users/${encodeURIComponent(user)}/habits`, {
    method: 'PATCH',
    body: JSON.stringify(buildHabitPatchPayload(body, opts.date)),
  });
}
