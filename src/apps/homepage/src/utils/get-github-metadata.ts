const API_URL = 'https://api.github.com/repos/mlisbit/habsum';

export type GithubRelease = { tag: string; publishedAt: string };
export type GithubMetadata = { stars: number | null; release: GithubRelease | null };

export default async function getGithubMetadata(signal: AbortSignal): Promise<GithubMetadata> {
  const getJson = async (path: string): Promise<Record<string, unknown>> => {
    const response = await fetch(`${API_URL}${path}`, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error('GitHub metadata is unavailable.');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid GitHub metadata.');
    }
    return data as Record<string, unknown>;
  };

  const [repository, latestRelease] = await Promise.allSettled([
    getJson(''),
    getJson('/releases/latest'),
  ]);
  const stars = repository.status === 'fulfilled' ? repository.value.stargazers_count : null;
  const release = latestRelease.status === 'fulfilled' ? latestRelease.value : null;

  return {
    stars: typeof stars === 'number' && Number.isSafeInteger(stars) && stars >= 0 ? stars : null,
    release:
      release &&
      typeof release.tag_name === 'string' &&
      release.tag_name.trim() !== '' &&
      typeof release.published_at === 'string' &&
      Number.isFinite(Date.parse(release.published_at))
        ? { tag: release.tag_name, publishedAt: release.published_at }
        : null,
  };
}
