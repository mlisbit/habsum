import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import NotFoundRoute, { loader } from './route';

afterEach(cleanup);

describe('not found route', () => {
  it('renders a themed recovery page with links home', () => {
    render(
      <MemoryRouter initialEntries={['/missing-page']}>
        <NotFoundRoute />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Page not found. Sorry.' })).toBeTruthy();
  });

  it('returns an HTTP 404 status', () => {
    expect(loader().init?.status).toBe(404);
  });
});
