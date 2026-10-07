import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import {
  ApiRequestError,
  createUser,
  getAdministratorEmailSettings,
  getUsernameAvailability,
  listUsers,
  sendUserInviteEmail,
} from '~/api.client';
import AdministratorUsers from './route';

vi.mock('~/api.client', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    constructor(
      readonly status: number,
      message: string,
      readonly body?: unknown,
    ) {
      super(message);
    }
  },
  adminDeleteUser: vi.fn(),
  adminResetUserPassword: vi.fn(),
  createOucSession: vi.fn(),
  createUser: vi.fn(),
  getAdministratorEmailSettings: vi.fn(),
  getUsernameAvailability: vi.fn(),
  listUsers: vi.fn(),
  sendUserInviteEmail: vi.fn(),
}));

function renderAdministratorUsers() {
  return render(
    <ToastProvider>
      <ModalProvider>
        <AdministratorUsers />
      </ModalProvider>
    </ToastProvider>,
  );
}

describe('Administrator user creation', () => {
  beforeEach(() => {
    vi.mocked(listUsers).mockResolvedValue({
      users: [
        {
          username: 'admin',
          displayName: null,
          email: 'admin@example.com',
          lastLoginAt: null,
          webAndApiVersion: null,
          habitCount: 0,
          eventCount: 0,
          entitlements: [],
        },
      ],
    });
    vi.mocked(createUser).mockResolvedValue({
      ok: true,
      user: 'invitee-example-com',
      email: 'invitee@example.com',
      password: 'temporary-password',
      registrationUrl: 'http://localhost:3000/reset-password?token=invite-token',
    });
    vi.mocked(sendUserInviteEmail).mockResolvedValue({
      ok: true,
      recipient: 'invitee@example.com',
    });
    vi.mocked(getUsernameAvailability).mockResolvedValue({ available: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('creates a user with email and username and offers email delivery when configured', async () => {
    vi.mocked(getAdministratorEmailSettings).mockResolvedValue({
      emailProvider: {
        name: 'resend',
        apiKey: 're_secret',
        email: 'admin@example.com',
      },
      updatedAt: 1,
    });
    const user = userEvent.setup();
    renderAdministratorUsers();

    await user.click(await screen.findByRole('button', { name: 'Create user' }));
    await user.type(screen.getByRole('textbox', { name: 'Username' }), 'invitedperson');
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'invitee@example.com');
    await user.type(screen.getByRole('textbox', { name: 'Display name' }), 'Invited Person');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        displayName: 'Invited Person',
        email: 'invitee@example.com',
        username: 'invitedperson',
      }),
    );
    expect(getUsernameAvailability).toHaveBeenCalledWith('invitedperson');
    expect(await screen.findByText('temporary-password')).toBeTruthy();
    expect(screen.getByRole('dialog').classList.contains('modal__dialog--large')).toBe(true);
    expect(screen.getByRole('link', { name: /reset-password\?token=invite-token/ })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Send email to invitee@example.com' }));
    await waitFor(() =>
      expect(sendUserInviteEmail).toHaveBeenCalledWith(
        'invitee-example-com',
        'http://localhost:3000/reset-password?token=invite-token',
      ),
    );
  });

  it('does not offer to send the invite when admin email is not configured', async () => {
    vi.mocked(getAdministratorEmailSettings).mockResolvedValue({ updatedAt: null });
    const user = userEvent.setup();
    renderAdministratorUsers();

    await user.click(await screen.findByRole('button', { name: 'Create user' }));
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'invitee@example.com');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('temporary-password')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send email to invitee@example.com' })).toBeNull();
  });

  it('shows email validation beneath the email input and marks the control as invalid', async () => {
    vi.mocked(getAdministratorEmailSettings).mockResolvedValue({ updatedAt: null });
    const user = userEvent.setup();
    renderAdministratorUsers();

    await user.click(await screen.findByRole('button', { name: 'Create user' }));
    const emailInput = screen.getByRole('textbox', { name: 'Email' });
    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create' }).hasAttribute('disabled')).toBe(true);
    expect(emailInput.getAttribute('aria-invalid')).toBe('true');
    expect(emailInput.parentElement?.classList.contains('input--error')).toBe(true);

    await user.type(emailInput, 'x');
    expect(screen.queryByText('Enter a valid email address.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create' }).hasAttribute('disabled')).toBe(false);
    expect(emailInput.getAttribute('aria-invalid')).toBeNull();
    expect(emailInput.parentElement?.classList.contains('input--error')).toBe(false);
  });

  it('renders structured create-user API errors on their associated field', async () => {
    vi.mocked(getAdministratorEmailSettings).mockResolvedValue({ updatedAt: null });
    vi.mocked(createUser).mockRejectedValue(
      new ApiRequestError(409, 'Conflict', {
        request: { username: 'existinguser' },
        errors: { username: 'Username is already in use.' },
      }),
    );
    const user = userEvent.setup();
    renderAdministratorUsers();

    await user.click(await screen.findByRole('button', { name: 'Create user' }));
    const usernameInput = screen.getByRole('textbox', { name: 'Username' });
    await user.type(usernameInput, 'existinguser');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Username is already in use.')).toBeTruthy();
    expect(usernameInput.getAttribute('aria-invalid')).toBe('true');
  });
});
