import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Brand } from '~/components/Brand';

afterEach(cleanup);

describe('Brand', () => {
  it.each(['small', 'large'] as const)('renders the %s variant', (size) => {
    render(<Brand size={size} />);

    const brand = screen.getByText('Habsum').closest('.brand');

    expect(brand?.classList.contains(`brand--${size}`)).toBe(true);
    expect(brand?.querySelector('img')?.getAttribute('src')).toBe('/favicon.svg');
  });
});
