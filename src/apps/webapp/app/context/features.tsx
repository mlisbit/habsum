import { createContext, useContext, type ReactNode } from 'react';
import type { AuthFeatures } from '@habsum/types/api-responses/auth-status-get';

const FeaturesContext = createContext<AuthFeatures | null>(null);

export function FeaturesProvider({
  features,
  children,
}: {
  features: AuthFeatures;
  children: ReactNode;
}) {
  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): AuthFeatures {
  const features = useContext(FeaturesContext);
  if (!features) throw new Error('useFeatures must be used within FeaturesProvider');
  return features;
}
