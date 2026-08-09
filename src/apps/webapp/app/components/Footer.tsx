import { useFeatureFlags } from '@habsum/feature-flags/client/react';
import type { FeatureFlagKey } from '@habsum/feature-flags/feature-flags';
import { Link } from 'react-router';
import { Brand } from '~/components/Brand';
import { useAuth } from '~/context/auth';
import { WEBAPP_VERSION } from '~/version';

export type FooterVariant = 'compact' | 'full';

function FooterLinks({ variant }: { variant: FooterVariant }) {
  return (
    <nav className="footer__legal" aria-label="Footer links">
      <Link className="footer__legal-link text-b-s text-light" to="/terms-of-service">
        {variant === 'full' ? 'Terms of Service' : 'Terms'}
      </Link>
      <span className="footer__separator" aria-hidden>
        &bull;
      </span>
      <Link className="footer__legal-link text-b-s text-light" to="/privacy-policy">
        {variant === 'full' ? 'Privacy Policy' : 'Privacy'}
      </Link>
      <span className="footer__separator" aria-hidden>
        &bull;
      </span>
      <Link className="footer__legal-link text-b-s text-light" to="/contact">
        Contact
      </Link>
    </nav>
  );
}

export function Footer({ className, variant }: { className?: string; variant?: FooterVariant }) {
  const { isFlagEnabled } = useFeatureFlags<FeatureFlagKey>();
  const { status } = useAuth();
  const shouldShowBrand =
    variant === 'full' || (variant === 'compact' && status === 'authenticated');
  const showVersion = isFlagEnabled('show-version-in-footer');

  if (!shouldShowBrand && !showVersion) return null;

  return (
    <footer
      className={[
        'footer',
        variant === 'full' ? 'footer--full' : '',
        variant === 'compact' ? 'footer--compact' : '',
        'text-b-s',
        'text-light',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="footer__inner">
        {shouldShowBrand ? (
          <div className="footer__identity">
            {variant === 'full' ? (
              <>
                <Link className="footer__brand" to="/">
                  <Brand size="small" className="text-light" />
                </Link>
                <div className="footer__details">
                  <span className="footer__copyright">&copy; 2026</span>
                  {showVersion ? (
                    <>
                      <span className="footer__separator" aria-hidden>
                        &bull;
                      </span>
                      <span className="footer__version">v{WEBAPP_VERSION}</span>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link className="footer__brand" to="/">
                  <Brand size="small" className="text-light" />
                </Link>
                {showVersion ? <span className="footer__version">v{WEBAPP_VERSION}</span> : null}
              </>
            )}
          </div>
        ) : null}
        <div className="footer__meta">
          {shouldShowBrand && variant ? <FooterLinks variant={variant} /> : null}
          {!shouldShowBrand && showVersion ? (
            <span className="footer__version">v{WEBAPP_VERSION}</span>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
