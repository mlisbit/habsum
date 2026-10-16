import { afterEach, describe, expect, it, vi } from 'vitest';
import getGithubMetadata from './get-github-metadata';

afterEach(() => vi.unstubAllGlobals());

describe('GitHub homepage metadata', () => {
  it('reads the public star count and published release date', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ stargazers_count: 1234 }))
      .mockResolvedValueOnce(
        Response.json({ tag_name: 'v0.1.36', published_at: '2026-10-14T12:00:00Z' }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    await expect(getGithubMetadata(signal)).resolves.toEqual({
      stars: 1234,
      release: { tag: 'v0.1.36', publishedAt: '2026-10-14T12:00:00Z' },
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.github.com/repos/mlisbit/habsum',
      'https://api.github.com/repos/mlisbit/habsum/releases/latest',
    ]);
    expect(fetchMock.mock.calls[0][1].signal).toBe(signal);
  });

  it('keeps a zero star count when no release has been published', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ stargazers_count: 0 }))
        .mockResolvedValueOnce(new Response(null, { status: 404 })),
    );

    await expect(getGithubMetadata(new AbortController().signal)).resolves.toEqual({
      stars: 0,
      release: null,
    });
  });

  it('keeps release information if the repository request is rate limited', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 403 }))
        .mockResolvedValueOnce(
          Response.json({ tag_name: 'v1.0.0', published_at: '2026-10-14T12:00:00Z' }),
        ),
    );

    await expect(getGithubMetadata(new AbortController().signal)).resolves.toEqual({
      stars: null,
      release: { tag: 'v1.0.0', publishedAt: '2026-10-14T12:00:00Z' },
    });
  });

  it('falls back cleanly when offline or requests are aborted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(getGithubMetadata(new AbortController().signal)).resolves.toEqual({
      stars: null,
      release: null,
    });
  });

  it.each([
    [{ stargazers_count: -1 }, { tag_name: 'v1', published_at: 'invalid' }],
    [{ stargazers_count: '12' }, { tag_name: '', published_at: '2026-10-14' }],
    [null, []],
  ])(
    'ignores malformed metadata instead of rendering invalid values',
    async (repository, release) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(Response.json(repository))
          .mockResolvedValueOnce(Response.json(release)),
      );

      await expect(getGithubMetadata(new AbortController().signal)).resolves.toEqual({
        stars: null,
        release: null,
      });
    },
  );
});
