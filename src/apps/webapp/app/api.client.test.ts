import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createUser, getApplication } from './api.client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API GET request deduplication', () => {
  it('shares an in-flight request and allows a new request after it settles', async () => {
    let resolveFetch!: (response: Response) => void;
    const response = {
      ok: true,
      statusText: 'OK',
      text: async () => JSON.stringify({ serverTime: null }),
    } as Response;
    const inFlightFetch = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn(() => inFlightFetch);
    vi.stubGlobal('fetch', fetchMock);

    const first = getApplication();
    const second = getApplication();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(response);
    await Promise.all([first, second]);

    await getApplication();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('API errors', () => {
  it('preserves structured validation response bodies', async () => {
    const body = {
      request: { username: 'existing' },
      errors: { username: 'Username is already in use.' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify(body), {
            status: 409,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    await expect(createUser({ username: 'existing' })).rejects.toMatchObject({
      status: 409,
      body,
    } satisfies Partial<ApiRequestError>);
  });
});
