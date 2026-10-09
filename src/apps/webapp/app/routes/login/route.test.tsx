import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FeatureFlag, FeatureFlagKey } from '@habsum/types/api-responses/feature-flags';
import { FeatureFlagsProvider } from '~/context/feature-flags';
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

  return render(
    <MemoryRouter initialEntries={['/login']}>
      <FeatureFlagsProvider flags={flags}>
        <LoginRoute />
      </FeatureFlagsProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('login signup entry point', () => {
  it('links the top-left Habsum emblem to the application root', () => {
    renderLogin(null);

    expect(screen.getByRole('link', { name: 'Habsum home' }).getAttribute('href')).toBe('/');
  });

  it('shows the signup link when account creation is enabled', () => {
    renderLogin('noVerify');

    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe('/signup');
  });

  it('hides the signup link when account creation is disabled', () => {
    renderLogin(null);

    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull();
  });
});
