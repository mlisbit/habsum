import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import type { TrackingProvider } from '../tracking-provider';
import { TrackingService, type TrackingSpec } from '../tracking-spec';

type TrackingContextValue = {
  provider: TrackingProvider;
  service: TrackingService;
};

const TrackingContext = createContext<TrackingContextValue | null>(null);

export function TrackingContextProvider<TSpec extends TrackingSpec>({
  provider,
  spec,
  children,
}: {
  provider?: TrackingProvider;
  spec: TSpec;
  children: ReactNode;
}) {
  const parentContext = useContext(TrackingContext);
  const resolvedProvider = provider ?? parentContext?.provider;

  useEffect(() => {
    provider?.initialize();
  }, [provider]);

  const service = useMemo(
    () => (resolvedProvider ? new TrackingService(resolvedProvider, spec) : null),
    [resolvedProvider, spec],
  );

  if (!resolvedProvider || !service) {
    throw new Error(
      'TrackingContextProvider must receive a provider or be nested within another TrackingContextProvider',
    );
  }

  return (
    <TrackingContext.Provider value={{ provider: resolvedProvider, service }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking<TSpec extends TrackingSpec>(): TrackingService<TSpec> {
  const context = useContext(TrackingContext);
  if (!context) throw new Error('useTracking must be used within a TrackingContextProvider');

  return context.service as TrackingService<TSpec>;
}
