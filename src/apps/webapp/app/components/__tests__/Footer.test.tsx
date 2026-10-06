import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Footer } from '~/components/Footer';
import { WEBAPP_VERSION } from '~/version';

afterEach(cleanup);

describe('Footer', () => {
  it('always renders only the version', () => {
    const { container } = render(<Footer className="custom-footer" />);

    expect(screen.getByText(`v${WEBAPP_VERSION}`)).toBeTruthy();
    expect(container.querySelector('footer')?.classList.contains('custom-footer')).toBe(true);
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).not.toContain('©');
  });
});
