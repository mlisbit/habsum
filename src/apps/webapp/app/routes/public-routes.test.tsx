import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContactRoute from '~/routes/contact';
import PrivacyPolicyRoute from '~/routes/privacy-policy';
import TermsOfServiceRoute from '~/routes/terms-of-service';

vi.mock('~/context/auth', () => ({
  useAuth: () => ({ status: 'anonymous' }),
}));

vi.mock('@habsum/feature-flags/client/react', () => ({
  useFeatureFlags: () => ({ isFlagEnabled: () => false }),
}));

function renderRoute(route: ReactNode) {
  return render(<MemoryRouter>{route}</MemoryRouter>);
}

afterEach(cleanup);

describe('public footer routes', () => {
  it('renders the Privacy Policy MDX content', () => {
    renderRoute(<PrivacyPolicyRoute />);

    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeTruthy();
    expect(screen.getByText('todo')).toBeTruthy();
  });

  it('renders the Terms of Service MDX content', () => {
    renderRoute(<TermsOfServiceRoute />);

    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeTruthy();
    expect(screen.getByText('todo')).toBeTruthy();
  });

  it('renders the Contact email link', () => {
    renderRoute(<ContactRoute />);

    expect(screen.getByRole('heading', { name: 'Contact' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'mac@habsum.com' }).getAttribute('href')).toBe(
      'mailto:mac@habsum.com',
    );
  });
});
