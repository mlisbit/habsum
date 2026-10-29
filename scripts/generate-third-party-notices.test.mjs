import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import generateThirdPartyNotices from './generate-third-party-notices.mjs';

function getFixture(t, root = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'habsum-notices-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const writePackage = (path, pkg, files = {}) => {
    const packagePath = join(directory, path);
    mkdirSync(packagePath, { recursive: true });
    writeFileSync(join(packagePath, 'package.json'), JSON.stringify(pkg));
    for (const [name, text] of Object.entries(files)) {
      writeFileSync(join(packagePath, name), text);
    }
  };
  writePackage('.', { name: 'habsum', version: '1.0.0', private: true, ...root });
  return {
    directory,
    writePackage,
    readNotices: () => readFileSync(join(directory, 'THIRD_PARTY_NOTICES.md'), 'utf8'),
  };
}

test('includes hoisted workspace, nested, and dev dependencies while excluding first-party packages', async (t) => {
  const { directory, writePackage, readNotices } = getFixture(t, {
    workspaces: ['workspace'],
    devDependencies: { builder: '1.0.0' },
  });
  writePackage('workspace', {
    name: '@habsum/example',
    version: '1.0.0',
    private: true,
    dependencies: { runtime: '1.0.0' },
  });
  const workspaceLink = join(directory, 'node_modules/@habsum/example');
  mkdirSync(dirname(workspaceLink), { recursive: true });
  symlinkSync(join(directory, 'workspace'), workspaceLink, 'dir');
  writePackage(
    'node_modules/runtime',
    { name: 'runtime', version: '1.0.0', license: 'MIT', dependencies: { nested: '2.0.0' } },
    { LICENSE: 'Runtime license\nCopyright Runtime Authors\n' },
  );
  writePackage(
    'node_modules/runtime/node_modules/nested',
    { name: 'nested', version: '2.0.0', license: 'ISC' },
    { LICENSE: 'Nested license' },
  );
  writePackage(
    'node_modules/builder',
    { name: 'builder', version: '1.0.0', private: true },
    { LICENSE: 'Builder license' },
  );

  assert.equal(await generateThirdPartyNotices(directory), 3);
  const notices = readNotices();
  assert.match(notices, /## runtime@1\.0\.0/);
  assert.match(notices, /Runtime license\nCopyright Runtime Authors/);
  assert.match(notices, /## nested@2\.0\.0/);
  assert.match(notices, /Nested license/);
  assert.match(notices, /## builder@1\.0\.0/);
  assert.match(notices, /Builder license/);
  assert.doesNotMatch(notices, /## (habsum|@habsum\/example)@/);
  await generateThirdPartyNotices(directory);
  assert.equal(readNotices(), notices);
});

test('preserves multiple licenses, notices, and embedded Markdown fences verbatim', async (t) => {
  const { directory, writePackage, readNotices } = getFixture(t, {
    dependencies: { example: '1.0.0' },
  });
  writePackage(
    'node_modules/example',
    {
      name: 'example',
      version: '1.0.0',
      license: '(MIT OR Apache-2.0)',
      repository: { type: 'git', url: 'https://example.com/example.git' },
    },
    {
      'LICENSE-MIT': 'First license\r\nCopyright Example\r\n',
      'LICENSE-APACHE': 'Second license',
      NOTICE: 'Attribution\n```text\nLiteral fenced text\n```\n',
      'ThirdPartyNoticeText.txt': 'Bundled third-party attribution',
    },
  );

  await generateThirdPartyNotices(directory);
  const notices = readNotices();
  assert.match(notices, /License: \(MIT OR Apache-2\.0\)/);
  assert.match(notices, /Repository: https:\/\/example\.com\/example\n/);
  assert.match(notices, /First license\nCopyright Example/);
  assert.match(notices, /Second license/);
  assert.match(notices, /````text\nAttribution\n```text\nLiteral fenced text\n```\n````/);
  assert.match(notices, /Bundled third-party attribution/);
  assert.equal(notices.match(/### LICENSE-APACHE/g).length, 1);
});

test('keeps package metadata when license text is unavailable', async (t) => {
  const { directory, writePackage, readNotices } = getFixture(t, {
    dependencies: { example: '1.0.0' },
  });
  writePackage('node_modules/example', { name: 'example', version: '1.0.0', license: 'MIT' });
  await generateThirdPartyNotices(directory);
  assert.match(readNotices(), /## example@1\.0\.0\n\nLicense: MIT/);
  assert.match(readNotices(), /No license text was included in the installed package/);
});

test('fails instead of writing an empty dependency report', async (t) => {
  const { directory } = getFixture(t);
  await assert.rejects(generateThirdPartyNotices(directory), /No third-party packages found/);
  assert.equal(existsSync(join(directory, 'THIRD_PARTY_NOTICES.md')), false);
});
