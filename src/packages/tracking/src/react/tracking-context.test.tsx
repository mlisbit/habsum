// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TrackingProvider } from '../tracking-provider';
import { TrackingContextProvider, useTracking } from './tracking-context';

describe('TrackingContextProvider', () => {
  it('initializes and exposes its provider', () => {
    const provider: TrackingProvider = {
      initialize: vi.fn(),
      trackClick: vi.fn(),
    };
    let contextProvider: TrackingProvider | null = null;

    function Consumer() {
      contextProvider = useTracking();
      return null;
    }

    render(
      <TrackingContextProvider provider={provider}>
        <Consumer />
      </TrackingContextProvider>,
    );

    expect(provider.initialize).toHaveBeenCalledOnce();
    expect(contextProvider).toBe(provider);
  });
});
