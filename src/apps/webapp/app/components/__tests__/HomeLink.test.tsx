import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { HomeLink } from '~/components/HomeLink';

afterEach(cleanup);

describe('HomeLink', () => {
  it('renders the Habsum emblem as an application root link', () => {
    render(
      <MemoryRouter>
        <HomeLink />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Habsum home' });

    expect(link.getAttribute('href')).toBe('/');
    expect(link.querySelector('img')?.getAttribute('src')).toBe('/favicon.svg');
    expect(link.textContent).toBe('Habsum');
  });
});
