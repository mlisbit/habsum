import { parseArgs } from 'node:util';

export default function getDatabasePathArgument(args = process.argv.slice(2)): string | undefined {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    options: {
      db: { type: 'string' },
    },
  });

  const databasePath = values.db?.trim();
  if (values.db !== undefined && !databasePath) {
    throw new Error('--db must be a non-empty database path.');
  }
  return databasePath;
}
