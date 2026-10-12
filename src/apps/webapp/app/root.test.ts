import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeGetLoggedOut } from '@habsum/types/api-responses/me-get';
import { getAuthMe, getAuthStatus } from '~/api.server';
import { loader, meta } from './root';

vi.mock('~/api.server', () => ({
  getAuthMe: vi.fn(),
  getAuthStatus: vi.fn(),
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
  vi.mocked(getAuthStatus).mockResolvedValue({
    redirectPath: null,
    features: { accountSignup: false, forgotPassword: false },
  });
});

describe('root auth redirect guard', () => {
  it('uses the capitalized application title', () => {
    expect(meta({} as Parameters<typeof meta>[0])).toEqual([{ title: 'Habsum' }]);
  });

  it('redirects every other route to welcome when initial web signup is enabled', async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({
      redirectPath: '/welcome',
      features: { accountSignup: false, forgotPassword: false },
    });

    const response = await loader(getLoaderArgs('/login'));

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get('Location')).toBe('/welcome');
  });

  it('allows the welcome route when initial web signup is enabled', async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({
      redirectPath: '/welcome',
      features: { accountSignup: false, forgotPassword: false },
    });

    const result = await loader(getLoaderArgs('/welcome'));

    expect(result).toMatchObject({
      authStatus: {
        redirectPath: '/welcome',
        features: { accountSignup: false, forgotPassword: false },
      },
    });
  });

  it('allows ordinary routes when no redirect is required', async () => {
    expect(await loader(getLoaderArgs('/login'))).toMatchObject({
      authStatus: { redirectPath: null, features: { accountSignup: false, forgotPassword: false } },
    });
  });

  it('redirects away from welcome when initial web signup is unavailable', async () => {
    const response = await loader(getLoaderArgs('/welcome'));

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get('Location')).toBe('/');
  });
});
