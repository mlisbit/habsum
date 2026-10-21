import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { isDemoUser, renameUserAuthRecord, setUserDemo, setUserPassword } from './db.js';

describe('demo account storage', () => {
  it('defaults to ordinary accounts and preserves the demo flag through password changes and renames', () => {
    const user = 'demo-storage-user';
    setUserPassword(user, 'original-password');
    expect(isDemoUser(user)).toBe(false);
    expect(setUserDemo(user, true)).toBe(true);
    setUserPassword(user, 'changed-password');
    renameUserAuthRecord(user, `${user}-renamed`);
    expect(isDemoUser(`${user}-renamed`)).toBe(true);
    expect(setUserDemo(`${user}-renamed`, false)).toBe(true);
    expect(isDemoUser(`${user}-renamed`)).toBe(false);
    expect(setUserDemo('missing-demo-storage-user', true)).toBe(false);
  });

  it.each([false, true])(
    'migrates legacy users while preserving an existing demo flag=%s',
    (hasDemoFlag) => {
      const directory = mkdtempSync(join(tmpdir(), 'habsum-demo-migration-'));
      const path = join(directory, 'legacy.db');
      try {
        const legacy = new Database(path);
        legacy.exec(`
        CREATE TABLE users (
          username TEXT PRIMARY KEY,
          pin TEXT NOT NULL,
          admin INTEGER NOT NULL DEFAULT 0,
          theme TEXT NOT NULL DEFAULT 'dark'
          ${hasDemoFlag ? ', demo_user INTEGER NOT NULL DEFAULT 0' : ''}
        );
        INSERT INTO users (username, pin, admin) VALUES ('legacy-user', 'legacy-password', 1);
      `);
        if (hasDemoFlag) legacy.exec('UPDATE users SET demo_user = 1');
        legacy.close();

        execFileSync(
          process.execPath,
          [
            '--import',
            'tsx',
            '--input-type=module',
            '--eval',
            `import { db } from ${JSON.stringify(new URL('./db.ts', import.meta.url).href)}; db.close();`,
          ],
          { env: { ...process.env, HABSUM_DB: path } },
        );

        const migrated = new Database(path);
        try {
          const row = migrated
            .prepare('SELECT demo_user, admin FROM users WHERE username = ?')
            .get('legacy-user');
          expect(row).toEqual({ demo_user: hasDemoFlag ? 1 : 0, admin: 1 });
          migrated.prepare('UPDATE users SET theme = NULL WHERE username = ?').run('legacy-user');
        } finally {
          migrated.close();
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});
