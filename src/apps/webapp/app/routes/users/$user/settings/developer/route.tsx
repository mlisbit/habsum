import { useEffect, useState } from 'react';
import { getDeveloper, type DeveloperGetResponse } from '~/api.client';

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

export default function UserSettingsDeveloper() {
  const [developerData, setDeveloperData] = useState<DeveloperGetResponse | null>(null);
  const [developerError, setDeveloperError] = useState<string | null>(null);
  const [browserNow, setBrowserNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    setDeveloperError(null);
    getDeveloper()
      .then((res) => {
        if (!cancelled) setDeveloperData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setDeveloperData(null);
          setDeveloperError(e instanceof Error ? e.message : String(e));
        }
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
  const serverTime = developerData?.time ?? null;
  const version = developerData?.version ?? null;

  return (
    <div className="developer-page">
      <h2 className="text-h-l">Developer</h2>
      <p className="text-light text-b-m">API clocks and debugging context.</p>

      <div className="card developer-page__clocks">
        <h3 className="text-h-s">Time</h3>
        <p className="text-light text-b-m">
          Server clock is read from the habsum API process; your browser clock updates every second.
        </p>
        <dl className="developer-page__clock-list">
          <div className="developer-page__clock-row">
            <dt className="text-b-m">Server (API)</dt>
            <dd className="developer-page__clock-dd text-b-m">
              {developerError ? (
                <span className="text-light">Could not load: {developerError}</span>
              ) : serverTime ? (
                <>
                  <div>{formatInstantInZone(serverTime.iso, serverTime.timezone)}</div>
                  <div className="text-light text-b-s">Time zone: {serverTime.timezone}</div>
                </>
              ) : (
                <span className="text-light">Loading…</span>
              )}
            </dd>
          </div>
          <div className="developer-page__clock-row">
            <dt className="text-b-m">This device</dt>
            <dd className="developer-page__clock-dd text-b-m">
              <div>{browserNow.toLocaleString(undefined, clockFormat)}</div>
              <div className="text-light text-b-s">Time zone: {browserZone}</div>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card developer-page__version">
        <h3 className="text-h-s">Version</h3>
        <p className="text-light text-b-m">
          Current application version reported by the habsum API process.
        </p>

        {developerError ? (
          <p className="text-light text-b-m">Could not load: {developerError}</p>
        ) : version ? (
          <dl className="developer-page__version-list">
            <div className="developer-page__version-row">
              <dt className="text-b-m">Current</dt>
              <dd className="developer-page__version-dd text-b-m">v{version.currentVersion}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-light text-b-m">Loading…</p>
        )}
      </div>
    </div>
  );
}
