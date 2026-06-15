// exclusive-bem-block: security-page
import { useNavigate, useParams } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DayWithTime } from '@habsum/types/common/day';
import { dateFromDayWithTimeUtc } from '@habsum/types/common/day';
import type { SecurityGetSession } from '@habsum/types/api-responses/security-get';
import {
  getUserSecurity,
  revokeOtherUserSecuritySessions,
  revokeUserSecuritySession,
} from '~/api.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { Button } from '@habsum/ui/components/Button';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { useToast } from '@habsum/ui/contexts/toast';

function formatSessionTime(value: DayWithTime): string {
  const d = dateFromDayWithTimeUtc(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

function SessionRevokeButton({
  token,
  busy,
  onRevoke,
}: {
  token: string;
  busy: boolean;
  onRevoke: (token: string) => void;
}) {
  return (
    <Hoverable.Root>
      <Hoverable.Anchor className="security-page__session-revoke-anchor">
        <Button
          type="tertiary"
          size="small"
          icon="trash"
          circle
          aria-label={`Revoke session ${token}`}
          className="security-page__session-revoke"
          disabled={busy}
          onClick={() => onRevoke(token)}
        />
      </Hoverable.Anchor>
      <Hoverable.Content side="top">Revoke session</Hoverable.Content>
    </Hoverable.Root>
  );
}

export default function UserSettingsSecurity() {
  const { user: routeUser } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SecurityGetSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [revokeOthersBusy, setRevokeOthersBusy] = useState(false);
  const { showToast } = useToast();

  const otherSessionCount = useMemo(
    () => (sessions ?? []).filter((s) => !s.isActive).length,
    [sessions],
  );

  const loadSessions = useCallback(async () => {
    if (!routeUser) return;
    setSessions(null);
    setSessionsError(null);
    try {
      const res = await getUserSecurity(routeUser);
      setSessions(res.sessions);
    } catch (e) {
      setSessions([]);
      setSessionsError(e instanceof Error ? e.message : String(e));
    }
  }, [routeUser]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleRevokeSession = async (token: string) => {
    if (!routeUser) return;
    if (
      !window.confirm(
        `Revoke session ${token}? That device will be signed out and must log in again.`,
      )
    ) {
      return;
    }
    setRevokingToken(token);
    try {
      await revokeUserSecuritySession(routeUser, token);
      showToast({ type: 'success', message: 'Session revoked.' });
      await loadSessions();
    } catch (e) {
      showToast({
        type: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRevokingToken(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!routeUser || otherSessionCount === 0) return;
    if (
      !window.confirm(
        `Sign out ${otherSessionCount === 1 ? 'the other session' : `all ${otherSessionCount} other sessions`}? Only this browser will stay signed in.`,
      )
    ) {
      return;
    }
    setRevokeOthersBusy(true);
    try {
      const res = await revokeOtherUserSecuritySessions(routeUser);
      showToast({
        type: 'success',
        message:
          res.revoked === 1
            ? 'Signed out 1 other session.'
            : `Signed out ${res.revoked} other sessions.`,
      });
      await loadSessions();
    } catch (e) {
      showToast({
        type: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRevokeOthersBusy(false);
    }
  };

  const base = `/users/${encodeURIComponent(routeUser ?? '')}/settings/security`;

  return (
    <div className="security-page">
      <SettingsPageCard
        headerText="Password"
        actions={
          <Button
            type="secondary"
            text="Change password"
            onClick={() => navigate(`${base}/password`)}
          />
        }
      />

      <SettingsPageCard
        headerText="Sessions"
        headerAs="h3"
        className="security-page__sessions"
        actions={
          otherSessionCount > 0 ? (
            <Button
              type="secondary"
              text={revokeOthersBusy ? 'Signing out…' : 'Sign out other sessions'}
              disabled={sessions == null || revokeOthersBusy || revokingToken != null}
              onClick={() => void handleRevokeOtherSessions()}
            />
          ) : undefined
        }
      >
        <div className="card-padding" id="security-sessions">
          {sessions == null ? (
            <p className="security-page__sessions-empty text-light text-b-m">Loading sessions…</p>
          ) : sessionsError ? (
            <p className="security-page__sessions-empty text-b-m" role="alert">
              {sessionsError}
            </p>
          ) : sessions.length === 0 ? (
            <p className="security-page__sessions-empty text-light text-b-m">No sessions found.</p>
          ) : (
            <ul className="security-page__sessions-rows" aria-labelledby="security-sessions">
              {sessions.map((session) => (
                <li
                  key={`${session.token}-${session.createdAt}`}
                  className="security-page__session"
                >
                  <div className="security-page__sessions-row">
                    <div className="security-page__sessions-label text-b-m text-light">Token</div>
                    <div className="security-page__sessions-value security-page__sessions-value--token">
                      <span className="text-b-m security-page__sessions-token">
                        {session.token}
                        {session.isActive ? <span className="text-link"> · current</span> : null}
                      </span>
                      {!session.isActive ? (
                        <SessionRevokeButton
                          token={session.token}
                          busy={revokingToken === session.token}
                          onRevoke={(t) => void handleRevokeSession(t)}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="security-page__sessions-row">
                    <div className="security-page__sessions-label text-b-m text-light">Created</div>
                    <div className="security-page__sessions-value text-b-m">
                      {formatSessionTime(session.createdAt)}
                    </div>
                  </div>
                  <div className="security-page__sessions-row">
                    <div className="security-page__sessions-label text-b-m text-light">Expires</div>
                    <div className="security-page__sessions-value text-b-m">
                      {formatSessionTime(session.expiresAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsPageCard>
    </div>
  );
}
