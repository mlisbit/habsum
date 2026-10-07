import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeGetLoggedOut } from '@habsum/types/api-responses/me-get';
import { getAuthMe, getAuthStatus, getFeatureFlags } from '~/api.server';
import { loader } from './root';

vi.mock('~/api.server', () => ({
  getAuthMe: vi.fn(),
  getAuthStatus: vi.fn(),
  getFeatureFlags: vi.fn(),
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
  vi.mocked(getAuthStatus).mockResolvedValue({ hasUsers: true });
  vi.mocked(getFeatureFlags).mockResolvedValue({ flags: [] });
});

describe('root database status guard', () => {
  it('redirects every other route to welcome when the database has no users', async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({ hasUsers: false });

    const response = await loader(getLoaderArgs('/login'));

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get('Location')).toBe('/welcome');
  });

  it('allows the welcome route when the database has no users', async () => {
    vi.mocked(getAuthStatus).mockResolvedValue({ hasUsers: false });

    const result = await loader(getLoaderArgs('/welcome'));

    expect(result).toMatchObject({ authStatus: { hasUsers: false } });
  });

  it('redirects away from welcome after the database has a user', async () => {
    const response = await loader(getLoaderArgs('/welcome'));

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get('Location')).toBe('/');
  });
});
