import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MeGetLoggedIn,
  MeGetLoggedOut,
  MeGetResponse,
} from '@habsum/types/api-responses/me-get';
import { dayWithTimeFromString } from '@habsum/types/common/day';

import { AuthProvider, useAuth } from './auth';

vi.mock('~/api.client', () => ({
  loginUser: vi.fn(),
  logout: vi.fn(),
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
  isOucSession: false,
};

const loggedOut: MeGetLoggedOut = {
  username: null,
  displayName: null,
  email: null,
  theme: null,
  createdAt: null,
  entitlements: [],
};

function AuthSnapshot() {
  const { user, status } = useAuth();
  return <div>{`${status}:${user?.username ?? 'none'}`}</div>;
}

function renderAuth(me: MeGetResponse, onResolution?: (me: MeGetResponse) => void) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <AuthProvider me={me} onResolution={onResolution}>
          <AuthSnapshot />
        </AuthProvider>
      ),
    },
  ]);

  return render(<RouterProvider router={router} />);
}

describe('AuthProvider', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it('reports the resolved authentication value', async () => {
    const onResolution = vi.fn();

    renderAuth(resolvedUser, onResolution);

    await waitFor(() => expect(onResolution).toHaveBeenCalledWith(resolvedUser));
  });

  it('exposes the authenticated user directly from its loader value', () => {
    renderAuth(resolvedUser);

    expect(screen.getByText('authenticated:test-user')).toBeTruthy();
  });

  it('exposes an anonymous session without a user', () => {
    renderAuth(loggedOut);

    expect(screen.getByText('anonymous:none')).toBeTruthy();
  });
});
