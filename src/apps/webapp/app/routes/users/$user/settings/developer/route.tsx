import { useEffect, useState } from 'react';
import { getServerTime, type ServerTimeResponse } from '~/api.client';

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
  const [serverTime, setServerTime] = useState<ServerTimeResponse | null>(null);
  const [serverTimeError, setServerTimeError] = useState<string | null>(null);
  const [browserNow, setBrowserNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    setServerTimeError(null);
    getServerTime()
      .then((res) => {
        if (!cancelled) setServerTime(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setServerTime(null);
          setServerTimeError(e instanceof Error ? e.message : String(e));
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
              {serverTimeError ? (
                <span className="text-light">Could not load: {serverTimeError}</span>
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
    </div>
  );
}
