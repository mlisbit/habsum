import { afterEach, expect, it, vi } from 'vitest';
import { UpdateRepository } from './update-repository.js';

const githubRelease = {
  tag_name: 'v0.2.0',
  html_url: 'https://github.com/mlisbit/habsum/releases/tag/v0.2.0',
  draft: false,
  prerelease: false,
};
const expectedRelease = { version: '0.2.0', releaseNotesURI: githubRelease.html_url };

function mockRelease(data: unknown = githubRelease, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(data), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('reads and normalizes the latest published GitHub release', async () => {
  const fetchMock = mockRelease();
  expect(await new UpdateRepository().getLatestRelease()).toEqual(expectedRelease);
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.github.com/repos/mlisbit/habsum/releases/latest',
    expect.objectContaining({
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'habsum-update-check',
      },
      signal: expect.any(AbortSignal),
    }),
  );
});

it('shares pending lookups and refreshes successful results after 15 minutes', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  let resolveResponse!: (response: Response) => void;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const repository = new UpdateRepository();
  const first = repository.getLatestRelease();
  const concurrent = repository.getLatestRelease();
  expect(concurrent).toBe(first);
  resolveResponse(new Response(JSON.stringify(githubRelease)));
  expect(await first).toEqual(expectedRelease);
  expect(await repository.getLatestRelease()).toEqual(expectedRelease);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  vi.setSystemTime(15 * 60 * 1000);
  const refreshed = repository.getLatestRelease();
  resolveResponse(new Response(JSON.stringify(githubRelease)));
  await refreshed;
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('treats a missing published release as no release and caches that result', async () => {
  const fetchMock = mockRelease({ message: 'Not Found' }, 404);
  const repository = new UpdateRepository();
  expect(await repository.getLatestRelease()).toBeNull();
  expect(await repository.getLatestRelease()).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('backs off failed requests for one minute and retries afterward', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const fetchMock = mockRelease({ message: 'Rate limited' }, 403);
  const repository = new UpdateRepository();
  await expect(repository.getLatestRelease()).rejects.toThrow('status 403');
  await expect(repository.getLatestRelease()).rejects.toThrow('status 403');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  vi.setSystemTime(60 * 1000);
  await expect(repository.getLatestRelease()).rejects.toThrow('status 403');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('propagates network or timeout failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Timeout')));
  await expect(new UpdateRepository().getLatestRelease()).rejects.toThrow('Timeout');
});

it.each([
  null,
  { ...githubRelease, tag_name: 'invalid' },
  { ...githubRelease, draft: true },
  { ...githubRelease, prerelease: true },
  { ...githubRelease, html_url: 'https://other.example/releases/tag/v0.2.0' },
])('rejects unusable release metadata %j', async (release) => {
  mockRelease(release);
  await expect(new UpdateRepository().getLatestRelease()).rejects.toThrow(
    'Invalid GitHub release response',
  );
});
