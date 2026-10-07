import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import getDatabasePath from './get-database-path.js';
import getDatabasePathArgument from './get-database-path-argument.js';

const originalDatabasePath = process.env.HABSUM_DB_PATH;

afterEach(() => {
  if (originalDatabasePath === undefined) delete process.env.HABSUM_DB_PATH;
  else process.env.HABSUM_DB_PATH = originalDatabasePath;
});

describe('database path configuration', () => {
  it('uses the existing config-directory location by default', () => {
    delete process.env.HABSUM_DB_PATH;

    expect(getDatabasePath()).toBe(
      resolve(process.env.INIT_CWD ?? process.cwd(), 'config', 'habsum.db'),
    );
  });

  it('uses an explicit database file path when configured', () => {
    process.env.HABSUM_DB_PATH = './new-data/custom.db';

    expect(getDatabasePath()).toBe(
      resolve(process.env.INIT_CWD ?? process.cwd(), 'new-data/custom.db'),
    );
  });

  it('reads the database file path from the server argument', () => {
    expect(getDatabasePathArgument(['--db=./new-data/custom.db'])).toBe('./new-data/custom.db');
    expect(getDatabasePathArgument([])).toBeUndefined();
  });

  it('rejects positional, legacy, and empty database arguments', () => {
    expect(() => getDatabasePathArgument(['./new-data/positional.db'])).toThrow();
    expect(() => getDatabasePathArgument(['--db-path=./new-data/custom.db'])).toThrow();
    expect(() => getDatabasePathArgument(['--db='])).toThrow(
      '--db must be a non-empty database path.',
    );
  });
});
