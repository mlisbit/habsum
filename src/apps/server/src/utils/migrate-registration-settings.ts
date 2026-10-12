import type { Database } from 'better-sqlite3';

export default function migrateRegistrationSettings(database: Database): void {
  // Preserve the saved signup preference while retiring the generic flag framework.
  database.transaction(() => {
    database.exec(`CREATE TABLE IF NOT EXISTS registration_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), account_signup INTEGER NOT NULL DEFAULT 0
  )`);
    const legacyTable = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'feature_flags'")
      .get();
    if (legacyTable) {
      database
        .prepare(
          `INSERT OR IGNORE INTO registration_settings (id, account_signup)
      SELECT 1, CASE WHEN value IN ('enabled', 'noVerify', 'verify') THEN 1 ELSE 0 END
      FROM feature_flags WHERE key = 'enable-user-account-creation'`,
        )
        .run();
      database.exec('DROP TABLE feature_flags');
    }
    database.exec('INSERT OR IGNORE INTO registration_settings (id, account_signup) VALUES (1, 0)');
  })();
}
