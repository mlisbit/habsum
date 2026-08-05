import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import type { TrackingProvider } from '@habsum/tracking/client/provider';
import { ConsoleTrackingProvider } from '@habsum/tracking/client/providers/console';
import { UmamiTrackingProvider } from '@habsum/tracking/client/providers/umami';
import { TrackingContextProvider } from '@habsum/tracking/client/react';
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
