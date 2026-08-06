import { useFeatureFlags } from '@habsum/feature-flags/client/react';
import type { FeatureFlagKey } from '@habsum/feature-flags/feature-flags';
import { WEBAPP_VERSION } from '~/version';

/** Shows the bundled webapp semver (from `@habsum/webapp` `package.json`). */
export function Footer({ className }: { className?: string }) {
  const { isFlagEnabled } = useFeatureFlags<FeatureFlagKey>();
  if (!isFlagEnabled('show-version-in-footer')) return null;

  return (
    <footer className={['footer', 'text-b-s', 'text-light', className].filter(Boolean).join(' ')}>
      v{WEBAPP_VERSION}
    </footer>
  );
}
