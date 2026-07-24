import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config } from 'dotenv';

function findEnvLocalPath(startDir: string): string | null {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, '.env.local');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Loads repo `.env.local` when present (never committed). */
export default function loadLocalEnv(): void {
  const start = process.env.INIT_CWD ?? process.cwd();
  const envLocalPath = findEnvLocalPath(start);
  if (!envLocalPath) return;

  config({ path: envLocalPath, quiet: true });
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.log(`[habsum] loaded env from ${envLocalPath}`);
  }
}

loadLocalEnv();
