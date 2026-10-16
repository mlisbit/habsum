import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { yamlString } from '@habsum/types/common/misc';
import { ConfigYamlEditor } from './ConfigYamlEditor';

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ theme, value }: { theme: unknown; value: string }) => (
    <div data-testid="yaml-editor" data-theme={theme === 'light' ? 'light' : 'dark'}>
      {value}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

function mockSystemTheme(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? dark : !dark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('configuration editor theme', () => {
  it('uses the app’s light theme even when the operating system is dark', () => {
    mockSystemTheme(true);
    document.documentElement.dataset.theme = 'light';

    render(<ConfigYamlEditor text={yamlString('habits: []')} onChange={vi.fn()} />);

    expect(screen.getByTestId('yaml-editor').getAttribute('data-theme')).toBe('light');
  });

  it('follows active app theme changes without losing the editor contents', async () => {
    mockSystemTheme(false);
    document.documentElement.dataset.theme = 'dark';
    render(<ConfigYamlEditor text={yamlString('habits: []')} onChange={vi.fn()} />);

    expect(screen.getByTestId('yaml-editor').getAttribute('data-theme')).toBe('dark');

    document.documentElement.dataset.theme = 'light';

    await waitFor(() => {
      expect(screen.getByTestId('yaml-editor').getAttribute('data-theme')).toBe('light');
    });
    expect(screen.getByTestId('yaml-editor').textContent).toBe('habits: []');
  });
});
