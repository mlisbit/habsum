import { readFileSync } from 'node:fs';

export const PACKAGE_VERSION = readPackageVersion();

function readPackageVersion(): string {
  const fromEnv = process.env.HABSUM_VERSION ?? process.env.npm_package_version;
  if (fromEnv) return stripVersionPrefix(fromEnv);

  try {
    const raw = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function stripVersionPrefix(value: string) {
  return value.startsWith('v') ? value.slice(1) : value;
}
