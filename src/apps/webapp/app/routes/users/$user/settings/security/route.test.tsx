import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dayWithTimeFromString } from '@habsum/types/common/day';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import {
  getUserSecurity,
  revokeOtherUserSecuritySessions,
  revokeUserSecuritySession,
} from '~/api.client';
import UserSettingsSecurity from './route';

vi.mock('~/api.client', () => ({
  getUserSecurity: vi.fn(),
  revokeOtherUserSecuritySessions: vi.fn(),
  revokeUserSecuritySession: vi.fn(),
}));

function renderSecurity() {
  const router = createMemoryRouter(
    [{ path: '/users/:user/settings/security', element: <UserSettingsSecurity /> }],
    { initialEntries: ['/users/demo-user/settings/security'] },
  );
  return render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  const times = {
    createdAt: dayWithTimeFromString('2026-10-21 12:00:00'),
    expiresAt: dayWithTimeFromString('2099-10-21 12:00:00'),
  };
  vi.mocked(getUserSecurity).mockResolvedValue({
    sessions: [
      { ...times, token: 'active01', isActive: true },
      { ...times, token: 'other002', isActive: false },
    ],
  });
  vi.mocked(revokeOtherUserSecuritySessions).mockResolvedValue({ ok: true, revoked: 1 });
  vi.mocked(revokeUserSecuritySession).mockResolvedValue({ ok: true });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('security session controls', () => {
  it.each(['bulk', 'individual'])(
    'keeps the %s action visible and shows the API restriction in a toast',
    async (action) => {
      const message = 'Action prevented for demo users.';
      vi.mocked(revokeOtherUserSecuritySessions).mockRejectedValue(new Error(message));
      vi.mocked(revokeUserSecuritySession).mockRejectedValue(new Error(message));
      renderSecurity();
      const bulkButton = await screen.findByRole('button', { name: 'Sign out other sessions' });
      const individualButton = screen.getByRole('button', { name: 'Revoke session other002' });
      expect(bulkButton).toHaveProperty('disabled', false);
      expect(individualButton).toHaveProperty('disabled', false);
      fireEvent.click(action === 'bulk' ? bulkButton : individualButton);
      expect(await screen.findByText(message)).toBeTruthy();
      if (action === 'bulk') {
        expect(revokeOtherUserSecuritySessions).toHaveBeenCalledWith('demo-user');
      } else {
        expect(revokeUserSecuritySession).toHaveBeenCalledWith('demo-user', 'other002');
      }
      expect(screen.getByText('other002')).toBeTruthy();
      expect(screen.getByText('· current')).toBeTruthy();
      expect(getUserSecurity).toHaveBeenCalledOnce();
      expect(bulkButton).toHaveProperty('disabled', false);
      expect(individualButton).toHaveProperty('disabled', false);
    },
  );

  it('shows a success toast when the API allows session revocation', async () => {
    renderSecurity();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out other sessions' }));
    expect(await screen.findByText('Signed out 1 other session.')).toBeTruthy();
    expect(revokeOtherUserSecuritySessions).toHaveBeenCalledWith('demo-user');
    await waitFor(() => expect(getUserSecurity).toHaveBeenCalledTimes(2));
  });
});
