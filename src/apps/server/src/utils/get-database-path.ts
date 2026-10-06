import { join, resolve } from 'node:path';

export default function getDatabasePath(): string {
  const configDir = process.env.HABSUM_CONFIG_DIR;
  if (!configDir) {
    throw new Error('[habsum] HABSUM_CONFIG_DIR is required (must point to your data directory)');
  }
  return join(resolve(configDir), 'habsum.db');
}
