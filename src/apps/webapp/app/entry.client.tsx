import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import type { TrackingProvider } from '@habsum/tracking/provider';
import { ConsoleTrackingProvider } from '@habsum/tracking/providers/console';
import { UmamiTrackingProvider } from '@habsum/tracking/providers/umami';
import { TrackingContextProvider } from '@habsum/tracking/react';
import { webappTrackingSpec } from '~/tracking-spec';

const trackingProvider: TrackingProvider = import.meta.env.PROD
  ? new UmamiTrackingProvider()
  : new ConsoleTrackingProvider();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <TrackingContextProvider provider={trackingProvider} spec={webappTrackingSpec}>
        <RemixBrowser />
      </TrackingContextProvider>
    </StrictMode>,
  );
});
