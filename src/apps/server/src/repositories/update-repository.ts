export type UpdateRelease = {
  version: string;
  releaseNotesURI: string;
};

const SUCCESS_CACHE_MS = 15 * 60 * 1000;
const FAILURE_CACHE_MS = 60 * 1000;

// Retrieves published release metadata from the project's public GitHub API.
export class UpdateRepository {
  readonly releasesURI = 'https://github.com/mlisbit/habsum/releases';
  private cachedLookup: Promise<UpdateRelease | null> | null = null;
  private cacheExpiresAt = 0;

  getLatestRelease(): Promise<UpdateRelease | null> {
    if (this.cachedLookup && Date.now() < this.cacheExpiresAt) return this.cachedLookup;
    // Share the pending lookup as well as its result across footer requests.
    this.cacheExpiresAt = Infinity;
    this.cachedLookup = this.fetchLatestRelease().then(
      (release) => {
        this.cacheExpiresAt = Date.now() + SUCCESS_CACHE_MS;
        return release;
      },
      (error: unknown) => {
        this.cacheExpiresAt = Date.now() + FAILURE_CACHE_MS;
        throw error;
      },
    );
    return this.cachedLookup;
  }

  private async fetchLatestRelease(): Promise<UpdateRelease | null> {
    const response = await fetch('https://api.github.com/repos/mlisbit/habsum/releases/latest', {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'habsum-update-check',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404) return null;
    if (!response.ok)
      throw new Error(`GitHub release lookup failed with status ${response.status}`);

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') throw new Error('Invalid GitHub release response');
    const release = data as Record<string, unknown>;
    const version = typeof release.tag_name === 'string' ? release.tag_name.replace(/^v/, '') : '';
    if (
      !/^\d+\.\d+\.\d+$/.test(version) ||
      release.draft !== false ||
      release.prerelease !== false ||
      typeof release.html_url !== 'string' ||
      !release.html_url.startsWith(`${this.releasesURI}/tag/`)
    ) {
      throw new Error('Invalid GitHub release response');
    }
    return { version, releaseNotesURI: release.html_url };
  }
}
