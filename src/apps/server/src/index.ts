import './load-env.js';
import { join, resolve } from 'node:path';
import { closeDb } from './db.js';
import { createApp } from './app.js';

const app = createApp();

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const rawDir = process.env.HABSUM_CONFIG_DIR;
  const dataDir = rawDir ? resolve(rawDir) : '(missing)';
  const dbPath = rawDir ? join(dataDir, 'habsum.db') : '(missing)';
  const usersDir = rawDir ? join(dataDir, 'users') : '(missing)';
  console.log(`[habsum] HABSUM_CONFIG_DIR=${dataDir}`);
  console.log(`[habsum] DB=${dbPath}`);
  console.log(`[habsum] users=${usersDir}`);
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
    closeDb();
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
