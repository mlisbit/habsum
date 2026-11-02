import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.HABSUM_E2E_PORT ?? 3100);
const scenarios = [
  {
    name: 'initial-web-signup-enabled',
    port,
    initialWebSignup: 'true',
    testMatch: 'initial-web-signup.spec.ts',
  },
  {
    name: 'initial-web-signup-unset',
    port: port + 1,
    initialWebSignup: '',
    testMatch: 'initial-web-signup-unset.spec.ts',
  },
];

export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: scenarios.map(({ name, port, testMatch }) => ({
    name: `chromium-${name}`,
    testMatch,
    use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${port}` },
  })),
  webServer: scenarios.map(({ name, port, initialWebSignup }) => ({
    name,
    command: 'node --import tsx e2e/server.mjs',
    cwd: path.resolve(__dirname, '..'),
    env: {
      HABSUM_E2E_PORT: String(port),
      HABSUM_INITIAL_WEB_SIGNUP: initialWebSignup,
    },
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 5_000 },
  })),
});
