import { execFileSync } from 'node:child_process';

const SECRET_PATH_EXCEPTIONS = [
  /\.example$/,
  /\.sample$/,
];

const SECRET_PATH_PATTERNS = [
  /^config\//,
  /^\.env(?:$|\.)/,
  /(?:^|\/)\.env(?:$|\.)/,
  /(?:^|\/)(?:secrets?|credentials?)(?:\/|$)/i,
  /(?:^|\/)(?:id_rsa|id_ed25519|.*\.(?:key|pem|p12|pfx))$/i,
];

const SECRET_CONTENT_PATTERNS = [
  /github_pat_[A-Za-z0-9_]{20,}/,
  /gh[opsu]_[A-Za-z0-9_]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

const stagedFiles = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
  .split('\n')
  .filter(Boolean);

const blockedPaths = stagedFiles.filter(
  (file) =>
    !SECRET_PATH_EXCEPTIONS.some((pattern) => pattern.test(file)) &&
    SECRET_PATH_PATTERNS.some((pattern) => pattern.test(file)),
);

const stagedDiff = git(['diff', '--cached', '--unified=0', '--no-ext-diff']);
const blockedContent = SECRET_CONTENT_PATTERNS.flatMap((pattern) => {
  const match = stagedDiff.match(pattern);
  return match ? [match[0]] : [];
});

if (blockedPaths.length > 0 || blockedContent.length > 0) {
  console.error('Potential secret detected in staged changes.');
  if (blockedPaths.length > 0) {
    console.error('\nBlocked staged paths:');
    for (const file of blockedPaths) console.error(`- ${file}`);
  }
  if (blockedContent.length > 0) {
    console.error('\nBlocked staged content patterns:');
    for (const value of blockedContent) console.error(`- ${value.slice(0, 24)}...`);
  }
  console.error(
    '\nMove secrets to an untracked runtime config/secrets path or an environment secret.',
  );
  process.exit(1);
}
