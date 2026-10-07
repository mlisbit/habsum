import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Database } from 'bun:sqlite';

type DatabaseAccess = 'read-only' | 'read-write';

export default function getHabsumDatabase(
  configuredDatabasePath = process.env.HABSUM_DB_PATH,
  access: DatabaseAccess = 'read-only',
): Database {
  const trimmedDatabasePath = configuredDatabasePath?.trim();
  if (!trimmedDatabasePath) {
    throw new Error('HABSUM_DB_PATH is required and must point to the Habsum database file.');
  }

  const databasePath = resolve(trimmedDatabasePath);
  if (!existsSync(databasePath)) {
    throw new Error(`Habsum database not found at ${databasePath}.`);
  }

  return access === 'read-only'
    ? new Database(databasePath, { readonly: true })
    : new Database(databasePath, { readwrite: true });
}
