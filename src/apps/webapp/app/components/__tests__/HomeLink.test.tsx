import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { HomeLink } from '~/components/HomeLink';

afterEach(cleanup);

describe('HomeLink', () => {
  it('renders the Habsum emblem as a homepage link', () => {
    render(
      <MemoryRouter>
        <HomeLink />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Habsum homepage' });

    expect(link.getAttribute('href')).toBe('/');
    expect(link.querySelector('img')?.getAttribute('src')).toBe('/favicon.svg');
    expect(link.textContent).toBe('Habsum');
  });
});
