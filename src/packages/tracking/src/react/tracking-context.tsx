import { createContext, useContext, useEffect, type ReactNode } from 'react';

import type { TrackingProvider } from '../tracking-provider';

const TrackingContext = createContext<TrackingProvider | null>(null);

export function TrackingContextProvider({
  provider,
  children,
}: {
  provider: TrackingProvider;
  children: ReactNode;
}) {
  useEffect(() => {
    provider.initialize();
  }, [provider]);

  return <TrackingContext.Provider value={provider}>{children}</TrackingContext.Provider>;
}

export function useTracking(): TrackingProvider {
  const provider = useContext(TrackingContext);
  if (!provider) throw new Error('useTracking must be used within a TrackingContextProvider');

  return provider;
}
