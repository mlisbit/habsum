import { UserAndAuthRepository } from './repositories/user-and-auth-repository.js';
import getInitialWebSignupStatus from './utils/get-initial-web-signup-status.js';
import { createApp } from './app.js';
import { DatabaseRepository } from './repositories/database-repository.js';
import getDatabasePath from './utils/get-database-path.js';

const app = createApp();
const databaseRepository = new DatabaseRepository();

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const dbPath = getDatabasePath();
  console.log(`[habsum] DB=${dbPath}`);
  console.log(
    `[habsum] ${getInitialWebSignupStatus(new UserAndAuthRepository().hasUsers()).message}`,
  );
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
