import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDir = mkdtempSync(join(tmpdir(), 'habsum-server-test-'));
process.env.HABSUM_DB = join(dataDir, 'habsum.db');
process.env.NODE_ENV = 'test';
process.env.HABSUM_ENABLE_DEMO = 'false';
