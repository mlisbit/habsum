import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeaturesProvider } from '~/context/features';
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

function renderLogin(accountSignup: boolean, forgotPassword = false) {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <FeaturesProvider features={{ accountSignup, forgotPassword }}>
        <LoginRoute />
      </FeaturesProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('login feature entry points', () => {
  it('shows password recovery only when available', () => {
    renderLogin(false, true);
    expect(screen.getByRole('link', { name: 'Forgot password?' }).getAttribute('href')).toBe(
      '/forgot-password',
    );
  });
  it('hides password recovery when unavailable', () => {
    renderLogin(false);
    expect(screen.queryByRole('link', { name: 'Forgot password?' })).toBeNull();
  });

  it('links the top-left Habsum emblem to the application root', () => {
    renderLogin(false);

    expect(screen.getByRole('link', { name: 'Habsum home' }).getAttribute('href')).toBe('/');
  });

  it('shows the signup link when account creation is enabled', () => {
    renderLogin(true);

    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe('/signup');
  });

  it('hides the signup link when account creation is disabled', () => {
    renderLogin(false);

    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull();
  });
});
