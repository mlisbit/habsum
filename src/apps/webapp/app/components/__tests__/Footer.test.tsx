import { getApplicationUpdates } from '~/api.client';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Footer } from '~/components/Footer';
import { WEBAPP_VERSION } from '~/version';

vi.mock('~/api.client', () => ({ getApplicationUpdates: vi.fn() }));

beforeEach(() => {
  vi.mocked(getApplicationUpdates).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function finishUpdateCheck() {
  await waitFor(() => expect(screen.queryByText('Checking for updates…')).toBeNull());
}

describe('Footer', () => {
  it('keeps the installed version visible when no update is available', async () => {
    const { container } = render(<Footer className="custom-footer" />);

    expect(screen.getByText(`v${WEBAPP_VERSION}`)).toBeTruthy();
    expect(container.querySelector('footer')?.classList.contains('custom-footer')).toBe(true);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).not.toContain('©');
    expect(screen.getByRole('status').textContent).toBe('Checking for updates…');
    await finishUpdateCheck();
    expect(getApplicationUpdates).toHaveBeenCalledWith(WEBAPP_VERSION);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a newer web release without replacing the installed version', async () => {
    vi.mocked(getApplicationUpdates).mockResolvedValue([
      {
        updateText: 'A new release is ready: v99.0.0',
        url: 'https://github.com/mlisbit/habsum/releases',
        style: 'info',
      },
    ]);
    render(<Footer />);
    await finishUpdateCheck();
    expect(screen.getByRole('status')).toHaveProperty(
      'textContent',
      'A new release is ready: v99.0.0',
    );
    expect(screen.getByText(`v${WEBAPP_VERSION}`)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'A new release is ready: v99.0.0' }).getAttribute('href'),
    ).toBe('https://github.com/mlisbit/habsum/releases');
  });

  it('keeps the footer usable when the update request fails', async () => {
    vi.mocked(getApplicationUpdates).mockRejectedValue(new Error('Offline'));
    render(<Footer />);
    await finishUpdateCheck();
    expect(getApplicationUpdates).toHaveBeenCalledWith(WEBAPP_VERSION);
    expect(screen.getByText(`v${WEBAPP_VERSION}`)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders server-provided warning text, link, and style', async () => {
    vi.mocked(getApplicationUpdates).mockResolvedValue([
      {
        updateText: 'A server-provided warning',
        url: 'https://github.com/mlisbit/habsum/releases',
        style: 'warn',
      },
    ]);
    render(<Footer />);
    await finishUpdateCheck();
    const link = screen.getByRole('link', { name: 'A server-provided warning' });
    expect(link.classList.contains('text-warning')).toBe(true);
    expect(link.getAttribute('href')).toBe('https://github.com/mlisbit/habsum/releases');
  });

  it('renders the override warning as plain text alongside the update link', async () => {
    vi.mocked(getApplicationUpdates).mockResolvedValue([
      {
        updateText: 'update available v0.1.37',
        url: 'https://github.com/mlisbit/habsum/releases/tag/v0.1.36',
        style: 'info',
      },
      { updateText: 'fake', url: null, style: 'warn' },
    ]);
    render(<Footer />);
    await finishUpdateCheck();
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    const warning = screen.getByText('fake');
    expect(warning.classList.contains('text-warning')).toBe(true);
    expect(warning.closest('a')).toBeNull();
  });

  it('shows a failed GitHub check as a plain-text warning', async () => {
    vi.mocked(getApplicationUpdates).mockResolvedValue([
      { updateText: 'trouble checking for updates', url: null, style: 'warn' },
    ]);
    render(<Footer />);
    await finishUpdateCheck();
    const warning = screen.getByText('trouble checking for updates');
    expect(warning.classList.contains('text-warning')).toBe(true);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(`v${WEBAPP_VERSION}`)).toBeTruthy();
  });

  it('continues showing the checking text while the request is pending', async () => {
    let rejectRequest!: (error: Error) => void;
    vi.mocked(getApplicationUpdates).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
    );
    render(<Footer />);
    expect(getApplicationUpdates).toHaveBeenCalledWith(WEBAPP_VERSION);
    expect(screen.getByRole('status').textContent).toBe('Checking for updates…');
    await act(async () => rejectRequest(new Error('Offline')));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
