/** Simulate a release one patch newer without modifying GitHub release metadata. */
export default function getVersionWithDevOffset(version: string, enabled: boolean): string {
  if (!enabled) return version;
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return version;
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}
