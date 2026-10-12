import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import getDatabasePath from './get-database-path.js';

const originalDatabasePath = process.env.HABSUM_DB;

afterEach(() => {
  if (originalDatabasePath === undefined) delete process.env.HABSUM_DB;
  else process.env.HABSUM_DB = originalDatabasePath;
});

describe('database path configuration', () => {
  it('uses the existing config-directory location by default', () => {
    delete process.env.HABSUM_DB;

    expect(getDatabasePath()).toBe(
      resolve(process.env.INIT_CWD ?? process.cwd(), 'config', 'habsum.db'),
    );
  });

  it('uses an explicit database file path when configured', () => {
    process.env.HABSUM_DB = './new-data/custom.db';

    expect(getDatabasePath()).toBe(
      resolve(process.env.INIT_CWD ?? process.cwd(), 'new-data/custom.db'),
    );
  });

  it('uses the default for a blank environment value', () => {
    process.env.HABSUM_DB = '   ';
    expect(getDatabasePath()).toBe(
      resolve(process.env.INIT_CWD ?? process.cwd(), 'config', 'habsum.db'),
    );
  });

  it('preserves an absolute database path and trims whitespace', () => {
    process.env.HABSUM_DB = ' /data/custom.db ';
    expect(getDatabasePath()).toBe('/data/custom.db');
  });
});
