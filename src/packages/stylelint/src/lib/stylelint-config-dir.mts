import fs from 'node:fs';
import path from 'node:path';

const STYLELINT_CONFIG_FILENAMES = [
  '.stylelintrc.json',
  '.stylelintrc',
  '.stylelintrc.yaml',
  '.stylelintrc.yml',
  'stylelint.config.js',
  'stylelint.config.mjs',
  'stylelint.config.cjs',
] as const;

function findStylelintConfigDir(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const { root } = path.parse(dir);

  while (true) {
    for (const name of STYLELINT_CONFIG_FILENAMES) {
      if (fs.existsSync(path.join(dir, name))) {
        return dir;
      }
    }
    if (dir === root) break;
    dir = path.dirname(dir);
  }

  return null;
}

/** Directory containing the nearest Stylelint config — used to resolve relative `tokensFile` paths. */
export function resolveTokensPathBaseDir(
  lintedFile: string | undefined,
  cwd = process.cwd(),
): string {
  const starts = [cwd];
  if (lintedFile && !lintedFile.startsWith('<')) {
    starts.push(path.dirname(path.resolve(lintedFile)));
  }

  for (const start of starts) {
    const configDir = findStylelintConfigDir(start);
    if (configDir) return configDir;
  }

  return cwd;
}
