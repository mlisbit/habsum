import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouteLoaderData } from 'react-router';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import {
  ApiRequestError,
  adminSetUserDemoAccount,
  createUser,
  getAdministratorEmailSettings,
  getUsernameAvailability,
  listUsers,
  sendUserInviteEmail,
} from '~/api.client';
import AdministratorUsers from './route';

const authMocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useParams: vi.fn(),
  useRouteLoaderData: vi.fn(),
}));

vi.mock('~/context/auth', () => ({ useAuth: () => ({ refresh: authMocks.refresh }) }));

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
  adminSetUserDemoAccount: vi.fn(),
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

describe('Administrator user management', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ user: 'operator' });
    vi.mocked(useRouteLoaderData).mockReturnValue({ application: { demoEnabled: false } });
    authMocks.refresh.mockResolvedValue(undefined);
    vi.mocked(getAdministratorEmailSettings).mockResolvedValue({ updatedAt: null });
    vi.mocked(adminSetUserDemoAccount).mockImplementation(async (user, demoUser) => ({
      ok: true,
      user,
      demoUser,
      entitlements: demoUser ? [ProductEntitlement.DEMO_USER] : [],
    }));
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

  it('hides demo account actions when demo mode is disabled', async () => {
    const operator = userEvent.setup();
    renderAdministratorUsers();
    await operator.click(await screen.findByRole('button', { name: 'Actions for admin' }));

    expect(screen.queryByRole('button', { name: 'Make demo account' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove demo status' })).toBeNull();
  });

  it('sets and removes demo status and updates the displayed user entitlements', async () => {
    vi.mocked(useRouteLoaderData).mockReturnValue({ application: { demoEnabled: true } });
    const operator = userEvent.setup();
    renderAdministratorUsers();
    await operator.click(await screen.findByRole('button', { name: 'Actions for admin' }));
    await operator.click(screen.getByRole('button', { name: 'Make demo account' }));

    await waitFor(() => expect(adminSetUserDemoAccount).toHaveBeenCalledWith('admin', true));
    expect(await screen.findByText('Made "admin" a demo account.')).toBeTruthy();
    await operator.click(screen.getByRole('button', { name: 'admin' }));
    expect(within(screen.getByRole('dialog')).getByText('DEMO_USER')).toBeTruthy();
    await operator.click(screen.getByRole('button', { name: 'Done' }));

    await operator.click(screen.getByRole('button', { name: 'Actions for admin' }));
    expect(screen.queryByRole('button', { name: 'Make demo account' })).toBeNull();
    await operator.click(screen.getByRole('button', { name: 'Remove demo status' }));
    await waitFor(() => expect(adminSetUserDemoAccount).toHaveBeenCalledWith('admin', false));
    expect(await screen.findByText('Removed demo status from "admin".')).toBeTruthy();
    await operator.click(screen.getByRole('button', { name: 'Actions for admin' }));
    expect(screen.getByRole('button', { name: 'Make demo account' })).toBeTruthy();
  });

  it('allows the current administrator to toggle demo status and refreshes their user model', async () => {
    vi.mocked(useRouteLoaderData).mockReturnValue({ application: { demoEnabled: true } });
    vi.mocked(useParams).mockReturnValue({ user: 'admin' });
    const operator = userEvent.setup();
    renderAdministratorUsers();
    await operator.click(await screen.findByRole('button', { name: 'Actions for admin' }));
    expect(screen.queryByRole('button', { name: 'Delete user' })).toBeNull();
    await operator.click(screen.getByRole('button', { name: 'Make demo account' }));

    await waitFor(() => expect(authMocks.refresh).toHaveBeenCalledOnce());
    expect(adminSetUserDemoAccount).toHaveBeenCalledWith('admin', true);
  });

  it('shows update failures and keeps the previous demo status', async () => {
    vi.mocked(useRouteLoaderData).mockReturnValue({ application: { demoEnabled: true } });
    vi.mocked(adminSetUserDemoAccount).mockRejectedValue(new Error('Could not save demo status'));
    const operator = userEvent.setup();
    renderAdministratorUsers();
    await operator.click(await screen.findByRole('button', { name: 'Actions for admin' }));
    await operator.click(screen.getByRole('button', { name: 'Make demo account' }));

    expect(await screen.findByText('Could not save demo status')).toBeTruthy();
    await operator.click(screen.getByRole('button', { name: 'Actions for admin' }));
    expect(screen.getByRole('button', { name: 'Make demo account' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove demo status' })).toBeNull();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows users in a table without exposing their email addresses', async () => {
    vi.mocked(getAdministratorEmailSettings).mockResolvedValue({ updatedAt: null });
    vi.mocked(listUsers).mockResolvedValue({
      users: [
        {
          username: 'admin',
          displayName: 'Admin User',
          email: 'admin@example.com',
          lastLoginAt: null,
          webAndApiVersion: null,
          habitCount: 3,
          eventCount: 12,
          entitlements: [],
        },
      ],
    });

    const operator = userEvent.setup();
    renderAdministratorUsers();

    const table = await screen.findByRole('table', { name: 'Users' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((heading) => heading.textContent),
    ).toEqual(['Username', 'Last activity', 'Habits', 'Events', '']);
    const row = within(table).getByRole('row', { name: /admin/ });
    expect(within(row).getByRole('rowheader').textContent).toBe('admin');
    expect(within(row).queryByText('Admin User')).toBeNull();
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Never', '3', '12', '']);
    expect(screen.queryByText('admin@example.com')).toBeNull();

    await operator.click(within(row).getByRole('button', { name: 'Actions for admin' }));
    expect(screen.getByRole('button', { name: 'Operate under' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete user' })).toBeTruthy();
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

    const sendEmailButton = screen.getByRole('button', {
      name: 'Send email to invitee@example.com',
    });
    expect(sendEmailButton.classList.contains('button--secondary')).toBe(true);
    await user.click(sendEmailButton);
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
