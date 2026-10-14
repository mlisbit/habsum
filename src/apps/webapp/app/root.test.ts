import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeGetLoggedOut } from '@habsum/types/api-responses/me-get';
import { getAuthMe, getApplication } from '~/api.server';
import { loader, meta } from './root';

vi.mock('~/api.server', () => ({
  getAuthMe: vi.fn(),
  getApplication: vi.fn(),
}));

const loggedOut: MeGetLoggedOut = {
  username: null,
  displayName: null,
  email: null,
  theme: null,
  createdAt: null,
  entitlements: [],
};

function getLoaderArgs(path: string): Parameters<typeof loader>[0] {
  return { request: new Request(`http://localhost${path}`) } as Parameters<typeof loader>[0];
}

beforeEach(() => {
  vi.mocked(getAuthMe).mockResolvedValue(loggedOut);
  vi.mocked(getApplication).mockResolvedValue({
    apiVersion: '1.2.3',
    serverTime: { iso: '2026-10-14T12:00:00Z', timezone: 'UTC' },
    database: { path: '/data/habsum.db' },
    redirectPath: null,
    features: { accountSignup: false, forgotPassword: false },
  });
});

describe('root auth redirect guard', () => {
  it('uses the capitalized application title', () => {
    expect(meta({} as Parameters<typeof meta>[0])).toEqual([{ title: 'Habsum' }]);
  });

  it('redirects every other route to welcome when initial web signup is enabled', async () => {
    vi.mocked(getApplication).mockResolvedValue({
      apiVersion: '1.2.3',
      serverTime: { iso: '2026-10-14T12:00:00Z', timezone: 'UTC' },
      database: { path: '/data/habsum.db' },
      redirectPath: '/welcome',
      features: { accountSignup: false, forgotPassword: false },
    });

    const response = await loader(getLoaderArgs('/login'));

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get('Location')).toBe('/welcome');
  });

  it('allows the welcome route when initial web signup is enabled', async () => {
    vi.mocked(getApplication).mockResolvedValue({
      apiVersion: '1.2.3',
      serverTime: { iso: '2026-10-14T12:00:00Z', timezone: 'UTC' },
      database: { path: '/data/habsum.db' },
      redirectPath: '/welcome',
      features: { accountSignup: false, forgotPassword: false },
    });

    const result = await loader(getLoaderArgs('/welcome'));

    expect(result).toMatchObject({
      application: {
        redirectPath: '/welcome',
        features: { accountSignup: false, forgotPassword: false },
      },
    });
  });

  it('allows ordinary routes when no redirect is required', async () => {
    expect(await loader(getLoaderArgs('/login'))).toMatchObject({
      application: {
        redirectPath: null,
        features: { accountSignup: false, forgotPassword: false },
      },
    });
  });

  it('redirects away from welcome when initial web signup is unavailable', async () => {
    const response = await loader(getLoaderArgs('/welcome'));

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get('Location')).toBe('/');
  });
});
