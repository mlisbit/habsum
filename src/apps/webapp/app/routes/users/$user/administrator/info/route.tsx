// exclusive-bem-block: administrator-info
import { useEffect, useState } from 'react';
import { Loader } from '@habsum/ui/components/Loader';
import { getAdministrator, type AdministratorGetResponse } from '~/api.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';

const clockFormat: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
};

function formatInstantInZone(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString(undefined, { ...clockFormat, timeZone });
}

export default function AdministratorInfo() {
  const [administratorData, setAdministratorData] = useState<AdministratorGetResponse | null>(null);
  const [administratorError, setAdministratorError] = useState<string | null>(null);
  const [browserNow, setBrowserNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    setAdministratorError(null);
    getAdministrator()
      .then((response) => {
        if (!cancelled) setAdministratorData(response);
      })
      .catch((error) => {
        if (cancelled) return;
        setAdministratorData(null);
        setAdministratorError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setBrowserNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const serverTime = administratorData?.time ?? null;
  const version = administratorData?.version ?? null;

  return (
    <div className="administrator-info">
      <SettingsPageCard headerText="Time" className="administrator-info__clocks">
        <div className="card-padding">
          <dl className="administrator-info__clock-list">
            <div className="administrator-info__clock-row">
              <dt className="text-b-m">Server (API)</dt>
              <dd className="administrator-info__clock-value text-b-m">
                {administratorError ? (
                  <span className="text-light">Could not load: {administratorError}</span>
                ) : serverTime ? (
                  <>
                    <div>{formatInstantInZone(serverTime.iso, serverTime.timezone)}</div>
                    <div className="text-light text-b-s">Time zone: {serverTime.timezone}</div>
                  </>
                ) : (
                  <Loader
                    className="administrator-info__loader"
                    label="Loading server time"
                    size="medium"
                  />
                )}
              </dd>
            </div>
            <div className="administrator-info__clock-row">
              <dt className="text-b-m">This device</dt>
              <dd className="administrator-info__clock-value text-b-m">
                <div>{browserNow.toLocaleString(undefined, clockFormat)}</div>
                <div className="text-light text-b-s">Time zone: {browserZone}</div>
              </dd>
            </div>
          </dl>
        </div>
      </SettingsPageCard>

      <SettingsPageCard headerText="Version" className="administrator-info__version">
        <div className="card-padding">
          {administratorError ? (
            <p className="text-light text-b-m">Could not load: {administratorError}</p>
          ) : version ? (
            <dl className="administrator-info__version-list">
              <div className="administrator-info__version-row">
                <dt className="text-b-m">Server</dt>
                <dd className="administrator-info__version-value text-b-m">
                  v{version.currentVersion}
                </dd>
              </div>
            </dl>
          ) : (
            <Loader className="administrator-info__loader" label="Loading version" size="medium" />
          )}
        </div>
      </SettingsPageCard>
    </div>
  );
}
