import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Database } from 'bun:sqlite';

type DatabaseAccess = 'read-only' | 'read-write';

export default function getHabsumDatabase(
  configuredDatabasePath = process.env.HABSUM_DB,
  access: DatabaseAccess = 'read-only',
): Database {
  const trimmedDatabasePath = configuredDatabasePath?.trim();
  const databasePath = resolve(
    process.env.INIT_CWD ?? process.cwd(),
    trimmedDatabasePath || 'config/habsum.db',
  );
  if (!existsSync(databasePath)) {
    throw new Error(`Habsum database not found at ${databasePath}.`);
  }

  return access === 'read-only'
    ? new Database(databasePath, { readonly: true })
    : new Database(databasePath, { readwrite: true });
}
