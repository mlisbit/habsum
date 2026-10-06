import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAdministrator } from './api.client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API GET request deduplication', () => {
  it('shares an in-flight request and allows a new request after it settles', async () => {
    let resolveFetch!: (response: Response) => void;
    const response = {
      ok: true,
      statusText: 'OK',
      text: async () => JSON.stringify({ time: null, version: null }),
    } as Response;
    const inFlightFetch = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn(() => inFlightFetch);
    vi.stubGlobal('fetch', fetchMock);

    const first = getAdministrator();
    const second = getAdministrator();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(response);
    await Promise.all([first, second]);

    await getAdministrator();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
