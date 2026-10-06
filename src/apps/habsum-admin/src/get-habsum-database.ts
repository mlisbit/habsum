import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Database } from 'bun:sqlite';

type DatabaseAccess = 'read-only' | 'read-write';

export default function getHabsumDatabase(
  configDir = process.env.HABSUM_CONFIG_DIR,
  access: DatabaseAccess = 'read-only',
): Database {
  const trimmedConfigDir = configDir?.trim();
  if (!trimmedConfigDir) {
    throw new Error('HABSUM_CONFIG_DIR is required and must point to the Habsum data directory.');
  }

  const databasePath = join(resolve(trimmedConfigDir), 'habsum.db');
  if (!existsSync(databasePath)) {
    throw new Error(`Habsum database not found at ${databasePath}.`);
  }

  return access === 'read-only'
    ? new Database(databasePath, { readonly: true })
    : new Database(databasePath, { readwrite: true });
}
