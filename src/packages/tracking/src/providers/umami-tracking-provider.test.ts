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
    provider.trackClick('login-click');

    const script = document.head.querySelector('script');
    const track = vi.fn();
    vi.stubGlobal('window', { umami: { track } });
    script?.dispatchEvent(new Event('load'));

    expect(track).toHaveBeenCalledWith('login-click');
  });

  it('forwards click events to Umami', () => {
    const track = vi.fn();
    vi.stubGlobal('window', { umami: { track } });

    new UmamiTrackingProvider().trackClick('homepage-login-click');

    expect(track).toHaveBeenCalledWith('homepage-login-click');
  });

  it('does not let Umami failures interrupt a click', () => {
    vi.stubGlobal('window', {
      umami: {
        track: () => {
          throw new Error('tracker unavailable');
        },
      },
    });

    expect(() => new UmamiTrackingProvider().trackClick('login-click')).not.toThrow();
  });
});
