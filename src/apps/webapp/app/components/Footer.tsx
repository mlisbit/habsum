import type { ApplicationUpdatesGetResponse } from '@habsum/types/api-responses/application-updates-get';
import { useEffect, useState } from 'react';
import { useRouteLoaderData } from 'react-router';
import { getApplicationUpdates } from '~/api.client';
import type { loader as rootLoader } from '~/root';
import { WEBAPP_VERSION } from '~/version';

export function Footer({ className }: { className?: string }) {
  const rootData = useRouteLoaderData<typeof rootLoader>('root');
  const [updates, setUpdates] = useState<ApplicationUpdatesGetResponse | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getApplicationUpdates(WEBAPP_VERSION)
      .then((response) => {
        if (!cancelled) setUpdates(response);
      })
      .catch(() => {
        // The installed version remains visible when update checks are unavailable.
      })
      .finally(() => {
        if (!cancelled) setCheckingUpdates(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className={['footer', 'text-b-s', 'text-light', className].filter(Boolean).join(' ')}>
      {checkingUpdates ? (
        <span className="footer__checking" role="status">
          Checking for updates…
        </span>
      ) : null}
      {updates?.map((update) => (
        <span className="footer__update" role="status" key={`${update.url}:${update.updateText}`}>
          {update.url !== null ? (
            <a
              href={update.url}
              className={update.style === 'warn' ? 'text-warning' : undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              {update.updateText}
            </a>
          ) : (
            <span className={update.style === 'warn' ? 'text-warning' : undefined}>
              {update.updateText}
            </span>
          )}
        </span>
      ))}
      <span className="footer__version">
        v{WEBAPP_VERSION}
        {rootData?.application.demoEnabled ? ' Demo' : ''}
      </span>
    </footer>
  );
}
