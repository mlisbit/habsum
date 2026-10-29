import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import checker from 'license-checker';

export default async function generateThirdPartyNotices(
  directory,
  outputPath = 'THIRD_PARTY_NOTICES.md',
) {
  const readPackage = (path) => JSON.parse(readFileSync(resolve(directory, path), 'utf8'));
  const root = readPackage('package.json');
  const firstPartyPackages = [
    root,
    ...(root.workspaces ?? []).map((workspace) => readPackage(`${workspace}/package.json`)),
  ].map((pkg) => `${pkg.name}@${pkg.version}`);
  // Do not use production-only scanning: workspace dependencies may be hoisted, and
  // the server image includes dev dependencies used to run its TypeScript sources.
  const packages = await new Promise((resolvePackages, reject) => {
    checker.init(
      { start: directory, excludePackages: firstPartyPackages.join(';') },
      (err, data) => {
        if (err) reject(err);
        else resolvePackages(data);
      },
    );
  });
  const entries = Object.entries(packages).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  if (!entries.length) {
    throw new Error('No third-party packages found. Run npm ci before generating notices.');
  }

  const sections = [
    '# Third-party notices',
    'Generated with license-checker from the installed Habsum Docker build dependencies, ' +
      'including runtime, bundled, and build dependencies. Each package retains its own license.',
  ];
  for (const [name, pkg] of entries) {
    sections.push(`## ${name}`, `License: ${[].concat(pkg.licenses).join(', ')}`);
    if (pkg.repository) sections.push(`Repository: ${pkg.repository}`);

    // license-checker selects one license file. Preserve additional licenses and
    // notices too, including files such as LICENSE-MIT and ThirdPartyNoticeText.txt.
    const files = new Set(
      readdirSync(pkg.path, { withFileTypes: true })
        .filter(
          (file) =>
            file.isFile() &&
            /^(licen[cs]e|copying|copyright|notice|third[-_ ]?party)/i.test(file.name),
        )
        .map((file) => resolve(pkg.path, file.name)),
    );
    if (pkg.licenseFile) files.add(pkg.licenseFile);
    if (pkg.noticeFile) files.add(pkg.noticeFile);
    for (const file of [...files].sort()) {
      const text = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').trimEnd();
      const fence = '`'.repeat(
        Math.max(3, ...[...text.matchAll(/`+/g)].map(([run]) => run.length + 1)),
      );
      sections.push(`### ${basename(file)}`, `${fence}text\n${text}\n${fence}`);
    }
    if (!files.size) {
      sections.push('No license text was included in the installed package; see its repository.');
    }
  }

  writeFileSync(resolve(directory, outputPath), `${sections.join('\n\n')}\n`);
  return entries.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const count = await generateThirdPartyNotices(process.cwd(), process.argv[2]);
  console.log(`Generated third-party notices for ${count} packages.`);
}
