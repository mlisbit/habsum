// Repository for database lifecycle operations outside request handling.
import { readFileSync, rmSync } from 'node:fs';
import getDatabasePath from '../utils/get-database-path.js';
import { closeDb, db } from './_private/db.js';

export class DatabaseRepository {
  getPath(): string {
    return getDatabasePath();
  }

  getFile(): Buffer {
    db.pragma('wal_checkpoint(TRUNCATE)');
    return readFileSync(this.getPath());
  }

  delete(): void {
    const databasePath = this.getPath();
    db.pragma('wal_checkpoint(TRUNCATE)');
    closeDb();
    rmSync(databasePath, { force: true });
    rmSync(`${databasePath}-wal`, { force: true });
    rmSync(`${databasePath}-shm`, { force: true });
  }

  close(): void {
    closeDb();
  }
}
