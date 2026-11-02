import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dayWithTimeFromString } from '@habsum/types/common/day';
import { yamlString, type UserConfigGetResponse } from '@habsum/types/common/misc';
import { ModalProvider } from '@habsum/ui/contexts/modal';
import { ToastProvider } from '@habsum/ui/contexts/toast';
import { getUserConfig, putUserConfig } from '~/api.client';
import UserSettingsConfig from '~/routes/users/$user/settings/config/route';

vi.mock('~/api.client', () => ({
  getUserConfig: vi.fn(),
  putUserConfig: vi.fn(),
}));

vi.mock('./ConfigGuiEditor', () => ({ ConfigGuiEditor: () => null }));

vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    onChange,
    readOnly,
    editable,
  }: {
    value: string;
    onChange: (value: string) => void;
    readOnly: boolean;
    editable: boolean;
  }) => (
    <textarea
      aria-label="YAML config"
      value={value}
      readOnly={readOnly || !editable}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function configResponse(text: string): UserConfigGetResponse {
  return {
    text: yamlString(text),
    config: { includeAbsentDaysInAverage: false, habits: [] },
    versions: [3, 2, 1].map((version) => ({
      version,
      savedAt: dayWithTimeFromString(`2026-11-0${version} 16:30:00`),
      isCurrent: version === 3,
    })),
  };
}

function renderConfig(search = '') {
  const router = createMemoryRouter(
    [{ path: '/users/:user/settings/habits/config', element: <UserSettingsConfig /> }],
    { initialEntries: [`/users/mac/settings/habits/config${search}`] },
  );
  render(
    <ToastProvider>
      <ModalProvider>
        <RouterProvider router={router} />
      </ModalProvider>
    </ToastProvider>,
  );
  return router;
}

beforeEach(() => {
  vi.mocked(getUserConfig).mockImplementation(async (_user, version) =>
    configResponse(version == null ? '# current\nhabits: {}' : `# revision ${version}\nhabits: {}`),
  );
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('YAML config revisions', () => {
  it('lists saved versions with dates and switches between history and the current config', async () => {
    const router = renderConfig('?tab=yaml');
    await screen.findByRole('textbox');
    fireEvent.click(screen.getByRole('button', { name: 'Config version' }));

    const menu = screen.getByRole('group', { name: 'Config versions' });
    expect(
      within(menu)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringMatching(/^Version 3 \(current\).+/),
      expect.stringMatching(/^Version 2.+/),
      expect.stringMatching(/^Version 1.+/),
    ]);
    expect(Array.from(menu.querySelectorAll('time')).map((time) => time.dateTime)).toEqual([
      '2026-11-03T16:30:00Z',
      '2026-11-02T16:30:00Z',
      '2026-11-01T16:30:00Z',
    ]);
    fireEvent.click(within(menu).getByRole('button', { name: /^Version 2/ }));

    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveProperty('value', '# revision 2\nhabits: {}'),
    );
    expect(router.state.location.search).toBe('?tab=yaml&v=2');
    expect(screen.getByRole('textbox')).toHaveProperty('readOnly', true);
    expect(screen.queryByRole('group', { name: 'Config versions' })).toBeNull();
    expect(getUserConfig).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Config version' }));
    expect(screen.getByRole('button', { name: /^Version 2 / }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: /^Version 3 \(current\)/ }));

    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveProperty('value', '# current\nhabits: {}'),
    );
    expect(router.state.location.search).toBe('?tab=yaml');
    expect(screen.getByRole('textbox')).toHaveProperty('readOnly', false);
    expect(putUserConfig).not.toHaveBeenCalled();
  });

  it('loads the URL version and updates the view when only the query changes', async () => {
    const router = renderConfig('?v=2');
    expect(await screen.findByRole('textbox', { name: 'YAML config' })).toHaveProperty(
      'value',
      '# revision 2\nhabits: {}',
    );
    expect(getUserConfig).toHaveBeenLastCalledWith('mac', '2');
    expect(screen.getByRole('textbox')).toHaveProperty('readOnly', true);
    expect(screen.getByText('Version 2 (read only)')).toBeTruthy();

    await act(async () => {
      await router.navigate('?v=3');
    });
    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveProperty('value', '# revision 3\nhabits: {}'),
    );
    expect(getUserConfig).toHaveBeenLastCalledWith('mac', '3');

    await act(async () => {
      await router.navigate('/users/mac/settings/habits/config');
    });
    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveProperty('value', '# current\nhabits: {}'),
    );
    expect(getUserConfig).toHaveBeenLastCalledWith('mac', undefined);
    expect(screen.getByRole('textbox')).toHaveProperty('readOnly', false);
    expect(screen.queryByText(/read only/)).toBeNull();
    expect(putUserConfig).not.toHaveBeenCalled();
  });

  it('protects unsaved edits when switching from the current config to a revision', async () => {
    renderConfig();
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: '# unsaved' } });

    fireEvent.click(screen.getByRole('button', { name: 'Config version' }));
    fireEvent.click(screen.getByRole('button', { name: /^Version 2 / }));
    expect(await screen.findByText('Discard unsaved changes?')).toBeTruthy();
    expect(getUserConfig).not.toHaveBeenCalledWith('mac', '2');

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('textbox')).toHaveProperty('value', '# unsaved');

    fireEvent.click(screen.getByRole('button', { name: 'Config version' }));
    fireEvent.click(screen.getByRole('button', { name: /^Version 2 / }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveProperty('value', '# revision 2\nhabits: {}'),
    );
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(putUserConfig).not.toHaveBeenCalled();
  });

  it('refreshes version choices after saving the current config', async () => {
    const saved = configResponse('# saved\nhabits: {}');
    saved.versions = [
      { version: 4, savedAt: dayWithTimeFromString('2026-11-04 16:30:00'), isCurrent: true },
      ...saved.versions.slice(0, 2).map((version) => ({ ...version, isCurrent: false })),
    ];
    vi.mocked(getUserConfig)
      .mockResolvedValueOnce(configResponse('# current\nhabits: {}'))
      .mockResolvedValueOnce(saved);
    vi.mocked(putUserConfig).mockResolvedValue({ ok: true, user: 'mac' });
    renderConfig();
    fireEvent.change(await screen.findByRole('textbox'), {
      target: { value: '# saved\nhabits: {}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Config version' }).textContent).toContain(
        'Version 4',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Config version' }));
    expect(screen.getByRole('button', { name: /^Version 4 \(current\)/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Version 1 / })).toBeNull();
    expect(getUserConfig).toHaveBeenCalledTimes(2);
  });

  it('reports unavailable revisions without displaying the current config', async () => {
    vi.mocked(getUserConfig).mockRejectedValue(new Error('config version 1 not found'));
    renderConfig('?v=1');

    expect(await screen.findByText('config version 1 not found')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(getUserConfig).toHaveBeenCalledWith('mac', '1');
  });

  it('ignores a late response after navigating to another revision', async () => {
    let resolvePrevious!: (response: ReturnType<typeof configResponse>) => void;
    vi.mocked(getUserConfig).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePrevious = resolve;
        }),
    );
    const router = renderConfig('?v=2');

    await act(async () => {
      await router.navigate('?v=3');
    });
    expect(await screen.findByRole('textbox')).toHaveProperty('value', '# revision 3\nhabits: {}');

    await act(async () => {
      resolvePrevious(configResponse('# stale\nhabits: {}'));
    });
    expect(screen.getByRole('textbox')).toHaveProperty('value', '# revision 3\nhabits: {}');
  });
});
