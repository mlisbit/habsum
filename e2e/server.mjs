import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const databaseDirectory = mkdtempSync(join(tmpdir(), 'habsum-e2e-'));

Object.assign(process.env, {
  NODE_ENV: 'test',
  HABSUM_DB: join(databaseDirectory, 'habsum.db'),
  HABSUM_ENABLE_DEMO: 'false',
});

// An empty config value overrides inherited settings; remove it to test an unset variable.
if (process.env.HABSUM_INITIAL_WEB_SIGNUP === '') {
  delete process.env.HABSUM_INITIAL_WEB_SIGNUP;
}

const servers = [];
let databaseRepository;
let isShuttingDown = false;

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  databaseRepository?.close();
  rmSync(databaseDirectory, { recursive: true, force: true });
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

try {
  // Database modules read HABSUM_DB on import, after the isolated environment is set.
  const { createApp } = await import('../src/apps/server/src/app.ts');
  const { DatabaseRepository } =
    await import('../src/apps/server/src/repositories/database-repository.ts');
  databaseRepository = new DatabaseRepository();

  const apiServer = createApp().listen(0, '127.0.0.1');
  servers.push(apiServer);
  await once(apiServer, 'listening');
  process.env.HABSUM_SERVER_URL = `http://127.0.0.1:${apiServer.address().port}`;

  // Import the production webapp after configuring its API upstream for SSR and /api.
  const { getWebServer } = await import('../src/apps/webapp/server.mjs');
  const webServer = getWebServer();
  servers.push(webServer);
  webServer.listen(Number(process.env.HABSUM_E2E_PORT ?? 3100), '127.0.0.1');
  await once(webServer, 'listening');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  await shutdown();
}
