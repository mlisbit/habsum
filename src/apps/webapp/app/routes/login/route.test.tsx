import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useRouteLoaderData } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeaturesProvider } from '~/context/features';
import LoginRoute from './route';

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), trackClick: vi.fn() }));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useRouteLoaderData: vi.fn(),
}));

vi.mock('@habsum/tracking/client/react', () => ({
  useTracking: () => ({ trackClick: mocks.trackClick }),
}));

vi.mock('~/context/auth', () => ({
  useAuth: () => ({
    user: null,
    signIn: mocks.signIn,
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

beforeEach(() => {
  vi.mocked(useRouteLoaderData).mockReturnValue({
    application: { demoEnabled: false, demoUser: null },
  });
  mocks.signIn.mockResolvedValue({ ok: true, user: 'demo-user' });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

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

describe('demo login', () => {
  const demoUser = { username: 'demo-user', password: 'demo-password' };

  function renderDemoLogin() {
    vi.mocked(useRouteLoaderData).mockReturnValue({
      application: { demoEnabled: true, demoUser },
    });
    return renderLogin(false);
  }

  it('hides the notice and demo CTA when demo mode is disabled', () => {
    vi.mocked(useRouteLoaderData).mockReturnValue({
      application: { demoEnabled: false, demoUser },
    });
    renderLogin(false);

    expect(
      screen.queryByText('This is a demo instance of Habsum. It is regularly reset.'),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Login as demo user' })).toBeNull();
  });

  it.each([
    null,
    undefined,
    {},
    { username: 'demo-user' },
    { password: 'demo-password' },
    { username: '', password: 'demo-password' },
    { username: 'demo-user', password: '' },
    { username: ' ', password: 'demo-password' },
    { username: 'demo-user', password: ' ' },
  ])(
    'shows the notice and hides the CTA when demo credentials are incomplete: %j',
    (credentials) => {
      vi.mocked(useRouteLoaderData).mockReturnValue({
        application: { demoEnabled: true, demoUser: credentials },
      });
      renderLogin(false);

      expect(
        screen.getByText('This is a demo instance of Habsum. It is regularly reset.'),
      ).toBeTruthy();
      expect(screen.getByText('Functionality will be limited to prevent abuse')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Login as demo user' })).toBeNull();
    },
  );

  it('prefills both fields and clicks the normal login button after one second', async () => {
    vi.useFakeTimers();
    renderDemoLogin();
    const loginButton = screen.getByRole('button', { name: 'Log in' });
    const onLoginClick = vi.fn();
    loginButton.addEventListener('click', onLoginClick);

    fireEvent.click(screen.getByRole('button', { name: 'Login as demo user' }));

    expect(screen.getByPlaceholderText('Username or email')).toHaveProperty(
      'value',
      demoUser.username,
    );
    expect(screen.getByPlaceholderText('Password')).toHaveProperty('value', demoUser.password);
    expect(screen.getByRole('button', { name: 'Login as demo user' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(mocks.signIn).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(999));
    expect(mocks.signIn).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(1));

    expect(onLoginClick).toHaveBeenCalledOnce();
    expect(mocks.trackClick).toHaveBeenCalledWith('login-click');
    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith(demoUser.username, demoUser.password);
  });

  it('cancels the delayed click when the user logs in manually during the delay', async () => {
    vi.useFakeTimers();
    renderDemoLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Login as demo user' }));

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Log in' })));
    await act(async () => vi.advanceTimersByTime(1_000));

    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith(demoUser.username, demoUser.password);
  });

  it('cancels the delayed click when the login screen is unmounted', async () => {
    vi.useFakeTimers();
    const { unmount } = renderDemoLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Login as demo user' }));

    unmount();
    await act(async () => vi.advanceTimersByTime(1_000));

    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('shows normal login errors and does not automatically retry', async () => {
    vi.useFakeTimers();
    mocks.signIn.mockRejectedValue(new Error('invalid credentials'));
    renderDemoLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Login as demo user' }));

    await act(async () => vi.advanceTimersByTime(1_000));

    expect(screen.getByText('invalid credentials')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Login as demo user' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(screen.getByPlaceholderText('Password')).toHaveProperty('disabled', false);
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(mocks.signIn).toHaveBeenCalledOnce();
  });
});
