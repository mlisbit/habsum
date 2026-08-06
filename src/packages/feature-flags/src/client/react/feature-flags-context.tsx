import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { FeatureFlag } from '../../feature-flag-types';
import { isFeatureFlagValueEnabled } from '../../feature-flags';

type FeatureFlagsContextValue = {
  flags: readonly FeatureFlag[];
  isFlagEnabled: (flagName: string) => boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider<const TFlagKey extends string>({
  flags,
  flagKeys,
  children,
}: {
  flags: readonly FeatureFlag<TFlagKey>[];
  flagKeys: readonly TFlagKey[];
  children: ReactNode;
}) {
  const configuredFlags = useMemo(() => {
    const requestedKeys = new Set<string>(flagKeys);
    return flags.filter((flag) => requestedKeys.has(flag.key));
  }, [flagKeys, flags]);

  const value = useMemo<FeatureFlagsContextValue>(() => {
    const flagValues = new Map<string, string | null>(
      configuredFlags.map((flag) => [flag.key, flag.value]),
    );
    return {
      flags: configuredFlags,
      isFlagEnabled: (flagName) => isFeatureFlagValueEnabled(flagValues.get(flagName)),
    };
  }, [configuredFlags]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags<TFlagKey extends string = string>(): Omit<
  FeatureFlagsContextValue,
  'flags' | 'isFlagEnabled'
> & {
  flags: readonly FeatureFlag<TFlagKey>[];
  isFlagEnabled: (flagName: TFlagKey) => boolean;
} {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }

  return context as unknown as Omit<FeatureFlagsContextValue, 'flags' | 'isFlagEnabled'> & {
    flags: readonly FeatureFlag<TFlagKey>[];
    isFlagEnabled: (flagName: TFlagKey) => boolean;
  };
}
