import type { TrackingProvider } from './tracking-provider';
import { TrackingService, TrackingSpec } from './tracking-spec';

const trackingSpec = new TrackingSpec({
  clicks: {
    'allowed-click': 'allowed-click',
  },
});

declare const provider: TrackingProvider;
const service = new TrackingService(provider, trackingSpec);

service.trackClick('allowed-click');

// @ts-expect-error The click key is not declared by this spec.
service.trackClick('not-allowed');

new TrackingSpec({
  clicks: {
    // @ts-expect-error A click value must exactly match its key.
    allowed: 'different-click',
  },
});
