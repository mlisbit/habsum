import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureFlag, FeatureFlagKey } from '@habsum/types/api-responses/feature-flags';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import {
  getAdministratorEmailSettings,
  sendAdministratorTestEmail,
  updateAdministratorEmailSettings,
} from '~/api.client';
import AdministratorOptions from './route';

const authState = vi.hoisted(() => ({ email: 'admin@example.com' }));
const featureFlagState = vi.hoisted(() => ({
  flags: [] as FeatureFlag<FeatureFlagKey>[],
}));

vi.mock('~/context/feature-flags', () => ({
  useFeatureFlags: () => ({ flags: featureFlagState.flags }),
}));

vi.mock('~/api.client', () => ({
  getAdministratorEmailSettings: vi.fn(),
  sendAdministratorTestEmail: vi.fn(),
  updateAdministratorEmailSettings: vi.fn(),
  updateFeatureFlag: vi.fn(),
}));

vi.mock('~/context/auth', () => ({
  useAuth: () => ({ user: { email: authState.email } }),
}));

function renderAdministratorOptions() {
  const router = createMemoryRouter(
    [
      {
        path: '/users/admin/administrator/options',
        element: (
          <ToastProvider>
            <ModalProvider>
              <AdministratorOptions />
            </ModalProvider>
          </ToastProvider>
        ),
      },
    ],
    {
      initialEntries: ['/users/admin/administrator/options'],
    },
  );

  return render(<RouterProvider router={router} />);
}

describe('Administrator options', () => {
  beforeEach(() => {
    authState.email = 'admin@example.com';
    featureFlagState.flags = [];
    vi.mocked(getAdministratorEmailSettings).mockResolvedValue({ updatedAt: null });
    vi.mocked(sendAdministratorTestEmail).mockImplementation(async ({ recipient }) => ({
      ok: true,
      recipient,
    }));
    vi.mocked(updateAdministratorEmailSettings).mockResolvedValue({ updatedAt: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the description and provider in the header, revealing options only for Resend', async () => {
    const user = userEvent.setup();
    renderAdministratorOptions();

    const provider = await screen.findByRole('combobox', { name: 'Email provider' });
    const description = screen.getByText(
      'Email is optional. Configure an email provider to send user notifications and allow users to reset their own passwords.',
    );
    expect(provider.closest('.settings-header')).toBeTruthy();
    expect(description.closest('.settings-header')).toBeTruthy();
    expect((provider as HTMLSelectElement).value).toBe('none');
    expect(
      Array.from((provider as HTMLSelectElement).options).map((option) => option.textContent),
    ).toEqual(['None', 'Resend']);
    expect(screen.queryByRole('textbox', { name: 'Resend API key' })).toBeNull();

    await user.selectOptions(provider, 'resend');

    const apiKey = screen.getByRole('textbox', { name: 'Resend API key' });
    const fromEmail = screen.getByRole('textbox', { name: 'Resend email address' });
    expect(apiKey.getAttribute('placeholder')).toBeNull();
    expect(fromEmail.getAttribute('placeholder')).toBeNull();

    const sendTestEmail = screen.getByRole('button', {
      name: 'Send email to admin@example.com',
    });
    const emailCard = screen.getByRole('heading', { name: 'Email Settings' }).closest('.card');
    expect((sendTestEmail as HTMLButtonElement).disabled).toBe(false);
    expect(sendTestEmail.closest('.settings-header')).toBeNull();
    expect(emailCard?.contains(sendTestEmail)).toBe(true);
  });

  it('shows feature flag options without implementation details', async () => {
    const user = userEvent.setup();
    featureFlagState.flags = [
      {
        key: 'enable-user-account-creation',
        value: 'verify',
        lastModifiedAt: 1_900_000_000,
        name: 'User registration',
        description: 'Allow users to create their own accounts.',
        options: {
          noVerify: { text: 'With no email verification' },
          verify: {
            text: 'With email verification',
            disabled: 'requires email configuration to be enabled',
          },
        },
      },
    ];

    renderAdministratorOptions();

    expect(screen.getByText('User registration')).toBeTruthy();
    expect(screen.getByText('Allow users to create their own accounts.')).toBeTruthy();
    expect(screen.queryByText('enable-user-account-creation')).toBeNull();
    expect(screen.queryByText(/Last modified:/)).toBeNull();

    const select = screen.getByRole('combobox', { name: 'User registration' });
    expect(Array.from((select as HTMLSelectElement).options).map((option) => option.value)).toEqual(
      ['', 'noVerify', 'verify'],
    );
    expect(screen.getByRole('option', { name: 'With email verification' })).toHaveProperty(
      'disabled',
      true,
    );
    const warning = screen.getByText('requires email configuration to be enabled');
    expect(select.parentElement?.contains(warning)).toBe(true);
    expect(screen.queryByRole('option', { name: /requires email configuration/ })).toBeNull();

    await user.selectOptions(select, 'noVerify');
    expect((select as HTMLSelectElement).value).toBe('noVerify');
    expect(screen.queryByText('requires email configuration to be enabled')).toBeNull();
  });

  it('shows field errors when an incomplete configuration is tested', async () => {
    const user = userEvent.setup();
    renderAdministratorOptions();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Email provider' }),
      'resend',
    );
    await user.click(screen.getByRole('button', { name: 'Send email to admin@example.com' }));

    expect(await screen.findByText('Resend API key is required.')).toBeTruthy();
    expect(screen.getByText('Email address is required.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sendAdministratorTestEmail).not.toHaveBeenCalled();
  });

  it('does not validate the sender email when the field loses focus', async () => {
    const user = userEvent.setup();
    renderAdministratorOptions();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Email provider' }),
      'resend',
    );
    const fromEmail = screen.getByRole('textbox', { name: 'Resend email address' });
    await user.type(fromEmail, 'not-an-email');
    await user.tab();

    expect(screen.queryByText('Enter a valid email address.')).toBeNull();
  });

  it('uses the same field validation when saving an incomplete configuration', async () => {
    const user = userEvent.setup();
    renderAdministratorOptions();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Email provider' }),
      'resend',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Resend API key is required.')).toBeTruthy();
    expect(screen.getByText('Email address is required.')).toBeTruthy();
    expect(updateAdministratorEmailSettings).not.toHaveBeenCalled();
  });

  it('opens a recipient modal prefilled with the account email and sends to its value', async () => {
    const user = userEvent.setup();
    renderAdministratorOptions();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Email provider' }),
      'resend',
    );
    await user.type(screen.getByRole('textbox', { name: 'Resend API key' }), ' re_secret ');
    await user.type(
      screen.getByRole('textbox', { name: 'Resend email address' }),
      ' sender@example.com ',
    );
    await user.click(screen.getByRole('button', { name: 'Send email to admin@example.com' }));

    const recipient = screen.getByRole('textbox', { name: 'Recipient email' });
    expect((recipient as HTMLInputElement).value).toBe('admin@example.com');
    await user.clear(recipient);
    await user.type(recipient, 'recipient@example.com');
    await user.click(screen.getByRole('button', { name: 'Send email' }));

    await waitFor(() =>
      expect(sendAdministratorTestEmail).toHaveBeenCalledWith({
        recipient: 'recipient@example.com',
        emailProvider: {
          name: 'resend',
          apiKey: 're_secret',
          email: 'sender@example.com',
        },
      }),
    );
  });

  it('shows test-delivery errors inside the Resend configuration instead of the card header', async () => {
    vi.mocked(sendAdministratorTestEmail).mockRejectedValue(new Error('Resend is unavailable.'));
    const user = userEvent.setup();
    renderAdministratorOptions();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Email provider' }),
      'resend',
    );
    await user.type(screen.getByRole('textbox', { name: 'Resend API key' }), 're_secret');
    await user.type(
      screen.getByRole('textbox', { name: 'Resend email address' }),
      'sender@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Send email to admin@example.com' }));
    await user.click(screen.getByRole('button', { name: 'Send email' }));

    const error = await screen.findByText('Resend is unavailable.');
    const emailCard = screen.getByRole('heading', { name: 'Email Settings' }).closest('.card');
    expect(error.closest('.settings-header')).toBeNull();
    expect(emailCard?.contains(error)).toBe(true);
  });

  it('uses a generic test action and an empty recipient when the account has no email', async () => {
    authState.email = '';
    const user = userEvent.setup();
    renderAdministratorOptions();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Email provider' }),
      'resend',
    );
    await user.type(screen.getByRole('textbox', { name: 'Resend API key' }), 're_secret');
    await user.type(
      screen.getByRole('textbox', { name: 'Resend email address' }),
      'sender@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Send test email' }));

    expect(
      (screen.getByRole('textbox', { name: 'Recipient email' }) as HTMLInputElement).value,
    ).toBe('');
    await user.click(screen.getByRole('button', { name: 'Send email' }));
    expect(await screen.findByText('Recipient email is required.')).toBeTruthy();
    expect(sendAdministratorTestEmail).not.toHaveBeenCalled();
  });

  it('closes the recipient modal from the backdrop without navigating or clearing drafts', async () => {
    const historyBack = vi.spyOn(window.history, 'back');
    const user = userEvent.setup();
    renderAdministratorOptions();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Email provider' }),
      'resend',
    );
    const apiKey = screen.getByRole('textbox', { name: 'Resend API key' });
    await user.type(apiKey, 're_draft');
    await user.type(
      screen.getByRole('textbox', { name: 'Resend email address' }),
      'sender@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Send email to admin@example.com' }));

    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement!;
    fireEvent.pointerDown(backdrop);
    fireEvent.click(backdrop);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(historyBack).not.toHaveBeenCalled();
    expect((apiKey as HTMLInputElement).value).toBe('re_draft');
    historyBack.mockRestore();
  });

  it('saves Resend through the existing email provider payload', async () => {
    vi.mocked(updateAdministratorEmailSettings).mockResolvedValue({
      emailProvider: {
        name: 'resend',
        apiKey: 're_secret',
        email: 'sender@example.com',
      },
      updatedAt: 1,
    });
    const user = userEvent.setup();
    renderAdministratorOptions();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Email provider' }),
      'resend',
    );
    await user.type(screen.getByRole('textbox', { name: 'Resend API key' }), 're_secret');
    await user.type(
      screen.getByRole('textbox', { name: 'Resend email address' }),
      'sender@example.com',
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateAdministratorEmailSettings).toHaveBeenCalledWith({
        emailProvider: {
          name: 'resend',
          apiKey: 're_secret',
          email: 'sender@example.com',
        },
      }),
    );
  });

  it('removes an existing provider when None is saved', async () => {
    vi.mocked(getAdministratorEmailSettings).mockResolvedValue({
      emailProvider: {
        name: 'resend',
        apiKey: 're_secret',
        email: 'sender@example.com',
      },
      updatedAt: 1,
    });
    const user = userEvent.setup();
    renderAdministratorOptions();

    const provider = await screen.findByRole('combobox', { name: 'Email provider' });
    expect((provider as HTMLSelectElement).value).toBe('resend');
    await user.selectOptions(provider, 'none');
    expect(screen.queryByRole('textbox', { name: 'Resend API key' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateAdministratorEmailSettings).toHaveBeenCalledWith({}));
  });
});
