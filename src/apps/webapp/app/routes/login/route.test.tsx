import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlagsProvider } from '@habsum/feature-flags/client/react';
import {
  FEATURE_FLAG_ENABLED_VALUE,
  FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
} from '@habsum/feature-flags/feature-flags';
import type { FeatureFlag } from '@habsum/feature-flags/types';
import LoginRoute from './route';

vi.mock('@habsum/tracking/client/react', () => ({
  useTracking: () => ({ trackClick: vi.fn() }),
}));

vi.mock('~/context/auth', () => ({
  useAuth: () => ({
    user: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('~/cookies.client', () => ({
  clearLegacyClientLoginMarkers: vi.fn(),
}));

function renderLogin(accountCreationValue: string | null) {
  const flags: FeatureFlag<FeatureFlagKey>[] = [
    {
      key: 'enable-user-account-creation',
      value: accountCreationValue,
      lastModifiedAt: 1_900_000_000,
    },
  ];

  return render(
    <MemoryRouter initialEntries={['/login']}>
      <FeatureFlagsProvider flags={flags} flagKeys={FEATURE_FLAG_KEYS}>
        <LoginRoute />
      </FeatureFlagsProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('login signup entry point', () => {
  it('links the top-left Habsum emblem to the homepage', () => {
    renderLogin(null);

    expect(screen.getByRole('link', { name: 'Habsum homepage' }).getAttribute('href')).toBe('/');
  });

  it('links to the public terms and privacy pages below the login button', () => {
    renderLogin(null);
    const consent = screen.getByText(/By logging in/).closest('p');

    expect(consent).not.toBeNull();
    const consentLinks = within(consent!);

    expect(consentLinks.getByRole('link', { name: 'Terms' }).getAttribute('href')).toBe(
      '/terms-of-service',
    );
    expect(consentLinks.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe(
      '/privacy-policy',
    );
  });

  it('shows the signup link when account creation is enabled', () => {
    renderLogin(FEATURE_FLAG_ENABLED_VALUE);

    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe('/signup');
  });

  it('hides the signup link when account creation is disabled', () => {
    renderLogin(null);

    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull();
  });
});
