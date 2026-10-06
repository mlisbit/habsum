import { describe, expect, it, vi } from 'vitest';

import { NoopTrackingProvider } from './noop-tracking-provider';

describe('NoopTrackingProvider', () => {
  it('ignores client tracking calls', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const provider = new NoopTrackingProvider();

    provider.initialize();
    provider.resolveIdentity('test-user');
    provider.track('test-click');

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
