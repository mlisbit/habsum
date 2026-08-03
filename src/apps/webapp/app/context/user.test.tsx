import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeGetLoggedIn } from '@habsum/types/api-responses/me-get';
import { dayWithTimeFromString } from '@habsum/types/common/day';

import { getAuthMe } from '~/api.client';
import { UserProvider } from './user';

vi.mock('~/api.client', () => ({
  getAuthMe: vi.fn(),
}));

vi.mock('~/theme.client', () => ({
  syncTheme: vi.fn(),
}));

const resolvedUser: MeGetLoggedIn = {
  username: 'test-user',
  admin: false,
  displayName: null,
  email: 'test-user@example.com',
  theme: null,
  createdAt: dayWithTimeFromString('2026-08-03 09:00:00'),
  entitlements: [],
  sessionTokenPrefix: 'abcd1234',
};

describe('UserProvider', () => {
  beforeEach(() => {
    vi.mocked(getAuthMe).mockResolvedValue(resolvedUser);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it('reports the result whenever the current user resolves', async () => {
    const onResolution = vi.fn();

    render(
      <UserProvider onResolution={onResolution}>
        <div />
      </UserProvider>,
    );

    await waitFor(() => expect(onResolution).toHaveBeenCalledWith(resolvedUser));
  });
});
