import type { HabitsResponse } from '@habsum/types/api-responses/habits-get';
import type { AuthStatusGetResponse } from '@habsum/types/api-responses/auth-status-get';
import type { FeatureFlagsGetResponse } from '@habsum/feature-flags/types';
import type { MeGetResponse } from '@habsum/types/api-responses/me-get';
import type { PatchHabitResponse } from '@habsum/types/api-responses/habit-patch';
import type { ListUsersResponse } from '@habsum/types/common/misc';
import { toDateKeyWithTime } from '@habsum/utils/date';
import { WEBAPP_VERSION } from '~/version';

const SERVER_URL =
  process.env.HABSUM_SERVER_URL ?? process.env.API_UPSTREAM ?? 'http://localhost:3001';

function buildHabitPatchPayload(
  body:
    | { habit: string; total: number; action?: 'add' | 'set' }
    | { habit: string; text: string }
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

export function getAuthMe(documentRequest: Request) {
  const cookie = documentRequest.headers.get('cookie');
  return request<MeGetResponse>('/users/me', {
    headers: {
      'x-habsum-web-version': WEBAPP_VERSION,
      ...(cookie ? { cookie } : {}),
    },
  });
}

export function getAuthStatus() {
  return request<AuthStatusGetResponse>('/auth/status');
}

export function getFeatureFlags() {
  return request<FeatureFlagsGetResponse>('/feature-flags');
}

export function getHabits(user: string) {
  return request<HabitsResponse>(`/users/${encodeURIComponent(user)}/habits`);
}

export function patchHabit(
  user: string,
  body:
    | { habit: string; total: number; action?: 'add' | 'set' }
    | { habit: string; text: string }
    | { habit: string; action: 'clear' }
    | { habit: string; action: 'delete_event'; eventId: number },
  opts: { date: string },
) {
  return request<PatchHabitResponse>(`/users/${encodeURIComponent(user)}/habits`, {
    method: 'PATCH',
    body: JSON.stringify(buildHabitPatchPayload(body, opts.date)),
  });
}
