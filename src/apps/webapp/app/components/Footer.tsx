import { useFeatureFlags } from '@habsum/feature-flags/client/react';
import type { FeatureFlagKey } from '@habsum/feature-flags/feature-flags';
import { WEBAPP_VERSION } from '~/version';

export function Footer({ className }: { className?: string }) {
  const { isFlagEnabled } = useFeatureFlags<FeatureFlagKey>();

  if (!isFlagEnabled('show-version-in-footer')) return null;

  return (
    <footer className={['footer', 'text-b-s', 'text-light', className].filter(Boolean).join(' ')}>
      <span className="footer__version">v{WEBAPP_VERSION}</span>
    </footer>
  );
}
