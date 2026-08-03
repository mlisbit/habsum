import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConsoleTrackingProvider } from './console-tracking-provider';

describe('ConsoleTrackingProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs initialization once', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = new ConsoleTrackingProvider();

    provider.initialize();
    provider.initialize();

    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('[tracking] initialized');
  });

  it('logs click events', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    new ConsoleTrackingProvider().track('test-click');

    expect(log).toHaveBeenCalledWith('[tracking] event', 'test-click');
  });
});
