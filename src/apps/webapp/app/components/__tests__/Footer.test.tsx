import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Footer } from '~/components/Footer';
import { WEBAPP_VERSION } from '~/version';

const state = vi.hoisted(() => ({ showVersion: false }));

vi.mock('@habsum/feature-flags/client/react', () => ({
  useFeatureFlags: () => ({ isFlagEnabled: () => state.showVersion }),
}));

beforeEach(() => {
  state.showVersion = false;
});

afterEach(cleanup);

describe('Footer', () => {
  it('does not render when version display is disabled', () => {
    const { container } = render(<Footer />);

    expect(container.querySelector('footer')).toBeNull();
  });

  it('renders only the version when version display is enabled', () => {
    state.showVersion = true;

    const { container } = render(<Footer className="custom-footer" />);

    expect(screen.getByText(`v${WEBAPP_VERSION}`)).toBeTruthy();
    expect(container.querySelector('footer')?.classList.contains('custom-footer')).toBe(true);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).not.toContain('©');
  });
});
