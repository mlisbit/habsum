import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeGetLoggedIn, MeGetLoggedOut } from '@habsum/types/api-responses/me-get';
import { dayWithTimeFromString } from '@habsum/types/common/day';
import { getAuthMe } from '~/api.server';
import { loader } from './route';

vi.mock('~/api.server', () => ({ getAuthMe: vi.fn() }));

const loggedOut: MeGetLoggedOut = {
  username: null,
  displayName: null,
  email: null,
  theme: null,
  createdAt: null,
  entitlements: [],
};

const loggedIn: MeGetLoggedIn = {
  username: 'test user',
  admin: false,
  displayName: null,
  email: 'test@example.com',
  theme: null,
  createdAt: dayWithTimeFromString('2026-10-06 12:00:00'),
  entitlements: [],
  isOucSession: false,
};

function getLoaderArgs(): Parameters<typeof loader>[0] {
  return { request: new Request('http://localhost/') } as Parameters<typeof loader>[0];
}

beforeEach(() => {
  vi.mocked(getAuthMe).mockReset();
});

describe('application root', () => {
  it('redirects anonymous visitors to login', async () => {
    vi.mocked(getAuthMe).mockResolvedValue(loggedOut);

    const response = await loader(getLoaderArgs());

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
  });

  it('redirects authenticated users to their habit dashboard', async () => {
    vi.mocked(getAuthMe).mockResolvedValue(loggedIn);

    const response = await loader(getLoaderArgs());

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/users/test%20user/habits');
  });
});
