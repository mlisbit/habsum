import { afterEach, expect, it, vi } from 'vitest';
import pkg from '../package.json';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it.each(['true', 'false', '', undefined])(
  'reports the real installed web version regardless of offset flag %s',
  async (flag) => {
    vi.resetModules();
    vi.stubEnv('HABSUM_DEV_VERSION_OFFSET', flag);
    const { WEBAPP_VERSION } = await import('./version');
    expect(WEBAPP_VERSION).toBe(pkg.version);
  },
);
