import { execFileSync } from 'node:child_process';

const ports = process.argv.slice(2);

if (ports.length === 0) {
  console.error('Usage: node scripts/kill-dev-ports.mjs <port> [port...]');
  process.exit(1);
}

function pidsForPort(port) {
  try {
    const output = execFileSync('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output
      .split(/\s+/)
      .map((pid) => Number(pid))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
}

const portPidPairs = ports.flatMap((port) => pidsForPort(port).map((pid) => ({ port, pid })));
const uniquePids = [...new Set(portPidPairs.map(({ pid }) => pid))];

if (uniquePids.length === 0) {
  console.log('[dev] reserved ports are free');
  process.exit(0);
}

for (const { port, pid } of portPidPairs) {
  console.log(`[dev] freeing port ${port}: stopping pid ${pid}`);
}

for (const pid of uniquePids) {
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

const timeoutMs = 3000;
const startedAt = Date.now();

while (Date.now() - startedAt < timeoutMs) {
  const remaining = ports.flatMap((port) => pidsForPort(port).map((pid) => ({ port, pid })));
  if (remaining.length === 0) {
    console.log('[dev] reserved ports are free');
    process.exit(0);
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
}

const remaining = ports.flatMap((port) => pidsForPort(port).map((pid) => `${port}:${pid}`));
console.error(`[dev] timed out waiting for reserved ports to free: ${remaining.join(', ')}`);
process.exit(1);
