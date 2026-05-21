import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'habsum-server-test-'));
process.env.HABSUM_CONFIG_DIR = dataDir;
process.env.NODE_ENV = 'test';
