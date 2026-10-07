import { resolve } from 'node:path';

export default function getDatabasePath(): string {
  const launchDirectory = process.env.INIT_CWD ?? process.cwd();
  const databasePath = process.env.HABSUM_DB_PATH?.trim();
  if (databasePath) return resolve(launchDirectory, databasePath);
  return resolve(launchDirectory, 'config', 'habsum.db');
}
