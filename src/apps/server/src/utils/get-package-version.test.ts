import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it.each([
  ['true', '0.1.36'],
  ['false', '0.1.36'],
  ['', '0.1.36'],
  [undefined, '0.1.36'],
])('resolves the server version with HABSUM_DEV_VERSION_OFFSET=%s', async (flag, expected) => {
  vi.resetModules();
  vi.stubEnv('npm_package_version', 'v0.1.36');
  vi.stubEnv('HABSUM_DEV_VERSION_OFFSET', flag);
  const { default: getPackageVersion } = await import('./get-package-version.js');
  expect(getPackageVersion()).toBe(expected);
});
