import type { Database } from 'better-sqlite3';

type EmailSettingsRow = {
  provider: string;
  api_key: string;
  from_email: string;
  updated_at: number;
};

export default function migrateApplicationSettings(database: Database): void {
  database.transaction(() => {
    const previousTables = new Set(
      database
        .prepare<[], { name: string }>(
          `SELECT name FROM sqlite_master
           WHERE type = 'table' AND name IN ('email_settings', 'registration_settings')`,
        )
        .all()
        .map((table) => table.name),
    );
    const existing = database.prepare('SELECT id FROM application_settings WHERE id = 1').get();

    if (!existing) {
      const registration = previousTables.has('registration_settings')
        ? database
            .prepare<
              [],
              { account_signup: number }
            >('SELECT account_signup FROM registration_settings WHERE id = 1')
            .get()
        : undefined;
      const email = previousTables.has('email_settings')
        ? database
            .prepare<
              [],
              EmailSettingsRow
            >("SELECT provider, api_key, from_email, updated_at FROM email_settings WHERE provider = 'resend'")
            .get()
        : undefined;

      database
        .prepare(
          `INSERT INTO application_settings (
             id, account_signup, email_provider, email_api_key, email_from_email, email_updated_at
           ) VALUES (1, ?, ?, ?, ?, ?)`,
        )
        .run(
          registration?.account_signup === 1 ? 1 : 0,
          email?.provider ?? null,
          email?.api_key ?? null,
          email?.from_email ?? null,
          email?.updated_at ?? null,
        );
    }

    if (previousTables.has('email_settings')) database.exec('DROP TABLE email_settings');
    if (previousTables.has('registration_settings'))
      database.exec('DROP TABLE registration_settings');
  })();
}
