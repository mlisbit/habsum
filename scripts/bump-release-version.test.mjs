import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bumpReleaseVersion from './bump-release-version.mjs';

for (const [type, expected] of [
  ['patch', '0.1.34'],
  ['minor', '0.2.0'],
  ['major', '1.0.0'],
]) {
  test(`${type} updates root, workspace and lockfile versions without changing dependencies`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'habsum-release-'));
    try {
      mkdirSync(join(directory, 'workspace'));
      writeFileSync(
        join(directory, 'package.json'),
        JSON.stringify({ version: '0.1.33', workspaces: ['workspace'] }),
      );
      writeFileSync(
        join(directory, 'workspace/package.json'),
        JSON.stringify({ version: '0.1.33', dependencies: { example: '^2.0.0' } }),
      );
      writeFileSync(
        join(directory, 'package-lock.json'),
        JSON.stringify({
          version: '0.1.33',
          packages: {
            '': { version: '0.1.33' },
            workspace: { version: '0.1.33' },
            'node_modules/example': { version: '2.1.0' },
          },
        }),
      );
      assert.equal(bumpReleaseVersion(directory, type), expected);
      const read = (file) => JSON.parse(readFileSync(join(directory, file), 'utf8'));
      assert.equal(read('package.json').version, expected);
      assert.deepEqual(read('workspace/package.json'), {
        version: expected,
        dependencies: { example: '^2.0.0' },
      });
      const lock = read('package-lock.json');
      assert.equal(lock.version, expected);
      assert.equal(lock.packages[''].version, expected);
      assert.equal(lock.packages.workspace.version, expected);
      assert.equal(lock.packages['node_modules/example'].version, '2.1.0');
      assert.throws(() => bumpReleaseVersion(directory, 'invalid'), /Release type/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
