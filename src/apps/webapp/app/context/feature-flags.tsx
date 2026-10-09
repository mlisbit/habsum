import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FeatureFlag } from '@habsum/types/api-responses/feature-flags';

type FeatureFlagsContextValue = {
  flags: readonly FeatureFlag[];
  getFlagValue: (flagName: string) => string | null;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider<const TFlagKey extends string>({
  flags,
  children,
}: {
  flags: readonly FeatureFlag<TFlagKey>[];
  children: ReactNode;
}) {
  const value = useMemo<FeatureFlagsContextValue>(() => {
    const flagValues = new Map<string, string | null>(flags.map((flag) => [flag.key, flag.value]));
    return {
      flags,
      getFlagValue: (flagName) => flagValues.get(flagName) ?? null,
    };
  }, [flags]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags<TFlagKey extends string = string>(): Omit<
  FeatureFlagsContextValue,
  'flags' | 'getFlagValue'
> & {
  flags: readonly FeatureFlag<TFlagKey>[];
  getFlagValue: (flagName: TFlagKey) => string | null;
} {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }

  return context as unknown as Omit<FeatureFlagsContextValue, 'flags' | 'getFlagValue'> & {
    flags: readonly FeatureFlag<TFlagKey>[];
    getFlagValue: (flagName: TFlagKey) => string | null;
  };
}
