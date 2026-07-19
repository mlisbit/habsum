// Repository for database lifecycle operations outside request handling.
import { closeDb } from './_private/db.js';

export class DatabaseRepository {
  close(): void {
    closeDb();
  }
}
