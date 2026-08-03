// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TrackingProvider } from '../tracking-provider';
import { TrackingSpec } from '../tracking-spec';
import { TrackingContextProvider, useTracking } from './tracking-context';

const trackingSpec = new TrackingSpec({
  clicks: {
    'mapped-click-event': 'mapped-click-event',
  },
});

describe('tracking context', () => {
  it('initializes and exposes its provider', () => {
    const provider: TrackingProvider = {
      initialize: vi.fn(),
      track: vi.fn(),
    };
    function Consumer() {
      const tracking = useTracking<typeof trackingSpec>();
      return <button onClick={() => tracking.trackClick('mapped-click-event')}>Track</button>;
    }

    render(
      <TrackingContextProvider provider={provider} spec={trackingSpec}>
        <Consumer />
      </TrackingContextProvider>,
    );

    expect(provider.initialize).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Track' }));
    expect(provider.track).toHaveBeenCalledWith('mapped-click-event');
  });

  it('binds different specs to the same provider', () => {
    const provider: TrackingProvider = {
      initialize: vi.fn(),
      track: vi.fn(),
    };
    const otherSpec = new TrackingSpec({
      clicks: {
        'other-click-event': 'other-click-event',
      },
    });

    function RootConsumer() {
      const tracking = useTracking<typeof trackingSpec>();

      return (
        <button onClick={() => tracking.trackClick('mapped-click-event')}>Track example</button>
      );
    }

    function NestedConsumer() {
      const tracking = useTracking<typeof otherSpec>();

      return <button onClick={() => tracking.trackClick('other-click-event')}>Track other</button>;
    }

    render(
      <TrackingContextProvider provider={provider} spec={trackingSpec}>
        <RootConsumer />
        <TrackingContextProvider spec={otherSpec}>
          <NestedConsumer />
        </TrackingContextProvider>
      </TrackingContextProvider>,
    );

    expect(provider.initialize).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Track example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Track other' }));
    expect(provider.track).toHaveBeenNthCalledWith(1, 'mapped-click-event');
    expect(provider.track).toHaveBeenNthCalledWith(2, 'other-click-event');
  });
});
