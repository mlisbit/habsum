// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { UmamiTrackingProvider } from './umami-tracking-provider';

describe('UmamiTrackingProvider', () => {
  afterEach(() => {
    document.head.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('loads the configured Umami tracker once', () => {
    vi.stubGlobal('window', {});
    const provider = new UmamiTrackingProvider();

    provider.initialize();
    provider.initialize();

    const scripts = document.head.querySelectorAll('script');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.src).toBe('https://cloud.umami.is/script.js');
    expect(scripts[0]?.dataset.websiteId).toBe('f9e17d35-39a9-43e9-83d7-98c2dab13020');
    expect(scripts[0]?.defer).toBe(true);
  });

  it('queues clicks until the tracker is loaded', () => {
    vi.stubGlobal('window', {});
    const provider = new UmamiTrackingProvider();
    provider.track('queued-click');

    const script = document.head.querySelector('script');
    const track = vi.fn();
    vi.stubGlobal('window', { umami: { track } });
    script?.dispatchEvent(new Event('load'));

    expect(track).toHaveBeenCalledWith('queued-click');
  });

  it('forwards click events to Umami', () => {
    const track = vi.fn();
    vi.stubGlobal('window', { umami: { track } });

    new UmamiTrackingProvider().track('test-click');

    expect(track).toHaveBeenCalledWith('test-click');
  });

  it('identifies a resolved user with Umami', () => {
    const identify = vi.fn();
    vi.stubGlobal('window', { umami: { identify, track: vi.fn() } });

    new UmamiTrackingProvider().resolveIdentity('test-user');

    expect(identify).toHaveBeenCalledWith('test-user', { isAuthenticated: true });
  });

  it('sends properties directly when an identity has no username', () => {
    const identify = vi.fn();
    vi.stubGlobal('window', { umami: { identify, track: vi.fn() } });

    new UmamiTrackingProvider().resolveIdentity();

    expect(identify).toHaveBeenCalledWith({ isAuthenticated: false });
  });

  it('resolves a queued identity before queued events', () => {
    vi.stubGlobal('window', {});
    const provider = new UmamiTrackingProvider();
    provider.resolveIdentity('test-user');
    provider.track('queued-click');

    const calls: string[] = [];
    vi.stubGlobal('window', {
      umami: {
        identify: (username: string) => calls.push(`identify:${username}`),
        track: (eventName: string) => calls.push(`track:${eventName}`),
      },
    });
    document.head.querySelector('script')?.dispatchEvent(new Event('load'));

    expect(calls).toEqual(['identify:test-user', 'track:queued-click']);
  });

  it('does not let Umami failures interrupt a click', () => {
    vi.stubGlobal('window', {
      umami: {
        track: () => {
          throw new Error('tracker unavailable');
        },
      },
    });

    expect(() => new UmamiTrackingProvider().track('test-click')).not.toThrow();
  });
});
