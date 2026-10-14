import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { deleteAdministratorDatabase } from '~/api.client';
import AdministratorInfo from './route';

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useRouteLoaderData: () => ({
    application: {
      apiVersion: '4.5.6',
      database: { path: '/data/custom.db' },
      serverTime: { iso: '2026-10-06T12:00:00.000Z', timezone: 'UTC' },
    },
  }),
}));

vi.mock('~/api.client', () => ({
  deleteAdministratorDatabase: vi.fn(),
  downloadAdministratorDatabase: vi.fn(),
}));

function renderInfo() {
  return render(
    <ToastProvider>
      <ModalProvider>
        <AdministratorInfo />
      </ModalProvider>
    </ToastProvider>,
  );
}

describe('AdministratorInfo database controls', () => {
  beforeEach(() => {
    vi.mocked(deleteAdministratorDatabase).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('shows the API version from root auth status', () => {
    renderInfo();
    expect(screen.getByText('v4.5.6')).toBeTruthy();
  });

  it('shows the configured path and requires the exact confirmation text to delete', async () => {
    const user = userEvent.setup();
    renderInfo();

    expect(await screen.findByText('/data/custom.db')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Delete database' }));

    const dialog = screen.getByRole('dialog');
    const confirmation = within(dialog).getByRole('textbox', { name: /type delete to confirm/i });
    const deleteButton = within(dialog).getByRole('button', {
      name: 'Delete database',
    }) as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(true);

    await user.type(confirmation, 'DELETE');
    expect(deleteButton.disabled).toBe(true);
    await user.clear(confirmation);
    await user.type(confirmation, 'delete');
    expect(deleteButton.disabled).toBe(false);

    await user.click(deleteButton);
    await waitFor(() => expect(deleteAdministratorDatabase).toHaveBeenCalledWith('delete'));
    expect(
      await screen.findByText(
        'The database was deleted. Restart Habsum to create a new empty database.',
      ),
    ).toBeTruthy();
  });
});
