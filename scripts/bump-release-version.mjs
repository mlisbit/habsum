import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export default function bumpReleaseVersion(directory, releaseType) {
  if (!['patch', 'minor', 'major'].includes(releaseType)) {
    throw new Error('Release type must be patch, minor, or major.');
  }
  const read = (file) => JSON.parse(readFileSync(resolve(directory, file), 'utf8'));
  const root = read('package.json');
  const match = root.version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error('The current version must be major.minor.patch.');
  const parts = match.slice(1).map(Number);
  const index = { major: 0, minor: 1, patch: 2 }[releaseType];
  parts[index]++;
  for (let position = index + 1; position < parts.length; position++) parts[position] = 0;
  const version = parts.join('.');
  const lock = read('package-lock.json');
  const files = [
    'package.json',
    ...root.workspaces.map((workspace) => `${workspace}/package.json`),
  ];
  const updates = files.map((file) => {
    const pkg = file === 'package.json' ? root : read(file);
    const lockPath = file === 'package.json' ? '' : file.slice(0, -'/package.json'.length);
    if (!lock.packages[lockPath]) throw new Error(`Missing lockfile entry: ${file}`);
    pkg.version = version;
    lock.packages[lockPath].version = version;
    return [file, pkg];
  });
  lock.version = version;
  updates.push(['package-lock.json', lock]);
  for (const [file, contents] of updates) {
    writeFileSync(resolve(directory, file), `${JSON.stringify(contents, null, 2)}\n`);
  }
  return version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(bumpReleaseVersion(process.cwd(), process.argv[2]));
}
