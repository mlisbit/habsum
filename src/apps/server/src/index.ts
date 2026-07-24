import './utils/load-local-env.js';
import { join, resolve } from 'node:path';
import { createApp } from './app.js';
import { DatabaseRepository } from './repositories/database-repository.js';

const app = createApp();
const databaseRepository = new DatabaseRepository();

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const rawDir = process.env.HABSUM_CONFIG_DIR;
  const dataDir = rawDir ? resolve(rawDir) : '(missing)';
  const dbPath = rawDir ? join(dataDir, 'habsum.db') : '(missing)';
  console.log(`[habsum] HABSUM_CONFIG_DIR=${dataDir}`);
  console.log(`[habsum] DB=${dbPath}`);
  console.log(`[habsum] server listening on http://${HOST}:${PORT}`);
});

let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[habsum] received ${signal}, shutting down...`);

  await new Promise<void>((resolveClose) => {
    server.close(() => resolveClose());
  });

  try {
    databaseRepository.close();
  } catch (e) {
    console.warn('[habsum] error closing db', e);
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT')
    .catch((e) => console.error(e))
    .finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM')
    .catch((e) => console.error(e))
    .finally(() => process.exit(0));
});
