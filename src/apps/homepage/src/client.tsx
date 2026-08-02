import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { TrackingProvider } from '@habsum/tracking/provider';
import { ConsoleTrackingProvider } from '@habsum/tracking/providers/console';
import { UmamiTrackingProvider } from '@habsum/tracking/providers/umami';
import { TrackingContextProvider } from '@habsum/tracking/react';

import { HomepageApp } from './main';

const trackingProvider: TrackingProvider = import.meta.env.PROD
  ? new UmamiTrackingProvider()
  : new ConsoleTrackingProvider();

const root = document.getElementById('root');
if (root?.dataset.homepageRoot === 'true') {
  createRoot(root).render(
    <StrictMode>
      <TrackingContextProvider provider={trackingProvider}>
        <HomepageApp />
      </TrackingContextProvider>
    </StrictMode>,
  );
}
