import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Footer, type FooterVariant } from '~/components/Footer';
import { WEBAPP_VERSION } from '~/version';

const state = vi.hoisted(() => ({ authenticated: true, showVersion: false }));

vi.mock('~/context/auth', () => ({
  useAuth: () => ({ status: state.authenticated ? 'authenticated' : 'anonymous' }),
}));

vi.mock('@habsum/feature-flags/client/react', () => ({
  useFeatureFlags: () => ({ isFlagEnabled: () => state.showVersion }),
}));

function CurrentPath() {
  return <span data-testid="current-path">{useLocation().pathname}</span>;
}

function renderFooter(variant?: FooterVariant) {
  return render(
    <MemoryRouter initialEntries={['/users/test/habits']}>
      <Footer variant={variant} />
      <CurrentPath />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  state.authenticated = true;
  state.showVersion = false;
});

afterEach(cleanup);

describe('Footer', () => {
  it('links authenticated users to the homepage from the Habsum brand', () => {
    renderFooter('compact');

    fireEvent.click(screen.getByRole('link', { name: 'Habsum' }));

    expect(screen.getByTestId('current-path').textContent).toBe('/');
  });

  it('links to public legal pages from the branded footer', () => {
    const { container } = renderFooter('compact');

    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toBe(
      '/terms-of-service',
    );
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe(
      '/privacy-policy',
    );
    expect(container.querySelectorAll('.footer__legal .footer__separator')).toHaveLength(2);
  });

  it('does not show the brand to anonymous users', () => {
    state.authenticated = false;

    renderFooter('compact');

    expect(screen.queryByRole('link', { name: 'Habsum' })).toBeNull();
  });

  it('does not show the brand unless the footer opts in', () => {
    renderFooter();

    expect(screen.queryByRole('link', { name: 'Habsum' })).toBeNull();
  });

  it('shows the Habsum brand in the full homepage variant for anonymous visitors', () => {
    state.authenticated = false;

    renderFooter('full');

    expect(screen.getByRole('link', { name: 'Habsum' })).toBeTruthy();
    expect(screen.getByText('© 2026')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeTruthy();
  });

  it('links to the public Contact page from the footer', () => {
    renderFooter('full');

    expect(screen.getByRole('link', { name: 'Contact' }).getAttribute('href')).toBe('/contact');
  });

  it('places the version beside the brand in the compact variant', () => {
    state.showVersion = true;

    const { container } = renderFooter('compact');

    expect(container.querySelector('.footer__identity > .footer__version')?.textContent).toBe(
      `v${WEBAPP_VERSION}`,
    );
    expect(container.querySelector('.footer__meta > .footer__version')).toBeNull();
  });

  it('shows the copyright and version inline beneath the full brand', () => {
    state.showVersion = true;

    const { container } = renderFooter('full');
    const identity = container.querySelector('.footer__identity');
    const details = container.querySelector('.footer__details');

    expect(identity?.children.item(0)?.textContent).toBe('Habsum');
    expect(details?.children.item(0)?.textContent).toBe('© 2026');
    expect(details?.children.item(1)?.textContent).toBe('•');
    expect(details?.children.item(2)?.textContent).toBe(`v${WEBAPP_VERSION}`);
    expect(container.querySelector('.footer__meta > .footer__version')).toBeNull();
  });
});
