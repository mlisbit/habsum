import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialUser } from '~/api.client';
import WelcomeRoute from './route';

const authMocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('~/api.client', () => ({
  createInitialUser: vi.fn(),
}));

vi.mock('~/context/auth', () => ({
  useAuth: () => ({ refresh: authMocks.refresh }),
}));

beforeEach(() => {
  authMocks.refresh.mockResolvedValue(undefined);
  vi.mocked(createInitialUser).mockResolvedValue({ ok: true, user: 'first-owner' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('welcome route', () => {
  it('submits only the initial username and password', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/welcome']}>
        <WelcomeRoute />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('Username'), 'first-owner');
    await user.type(screen.getByPlaceholderText('Password'), 'chosen-secret');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(createInitialUser).toHaveBeenCalledWith('first-owner', 'chosen-secret'),
    );
    expect(authMocks.refresh).toHaveBeenCalledOnce();
  });
});
