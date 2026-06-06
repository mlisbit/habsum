// exclusive-bem-block: security-page
import { useBlocker, useParams } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DayWithTime } from '@habsum/types/common/day';
import { dateFromDayWithTimeUtc } from '@habsum/types/common/day';
import type { SecurityGetSession } from '@habsum/types/api-responses/security-get';
import {
  changeUserPassword,
  getUserSecurity,
  revokeOtherUserSecuritySessions,
  revokeUserSecuritySession,
} from '~/api.client';
import { SettingsHeader } from '~/components/SettingsHeader';
import { Button } from '@habsum/ui/components/Button';
import { Hoverable } from '@habsum/ui/components/Hoverable';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { AlertModal, useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import {
  securityServerErrorToFieldMap,
  type SecurityErrorMap,
  validateSecurityPasswordSave,
} from '~/utils/validators/security';

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

function SaveFieldErrors({
  id,
  messages,
  className,
}: {
  id: string;
  messages: string[] | undefined;
  className: string;
}) {
  if (!messages?.length) return null;
  return (
    <InfoText variant="error" className={className} id={id} aria-live="polite">
      {messages.join(' ')}
    </InfoText>
  );
}

export default function UserSettingsSecurity() {
  const { user: routeUser } = useParams();
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveFieldErrors, setSaveFieldErrors] = useState<SecurityErrorMap>({});
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

  const hasDirty = useMemo(() => {
    const onlyCurrentPasswordFilled =
      pwdCurrent.trim() !== '' && pwdNew.trim() === '' && pwdConfirm.trim() === '';
    return (
      !onlyCurrentPasswordFilled &&
      (pwdCurrent.trim() !== '' || pwdNew.trim() !== '' || pwdConfirm.trim() !== '')
    );
  }, [pwdCurrent, pwdNew, pwdConfirm]);

  const newPasswordMatchFeedback = useMemo((): 'success' | 'error' | null => {
    const next = pwdNew.trim();
    const again = pwdConfirm.trim();
    if (next === '' || again === '') return null;
    return next === again ? 'success' : 'error';
  }, [pwdNew, pwdConfirm]);

  const { present, closeModal } = useModal();
  const blocker = useBlocker(hasDirty);

  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const presentRef = useRef(present);
  presentRef.current = present;
  const closeModalRef = useRef(closeModal);
  closeModalRef.current = closeModal;

  const hasDirtyRef = useRef(hasDirty);
  useEffect(() => {
    hasDirtyRef.current = hasDirty;
  }, [hasDirty]);

  const clearAllPasswordSaveErrors = useCallback(() => {
    setSaveFieldErrors((prev) => {
      if (
        prev.currentPassword == null &&
        prev.newPassword == null &&
        prev.confirmPassword == null
      ) {
        return prev;
      }
      const next = { ...prev };
      delete next.currentPassword;
      delete next.newPassword;
      delete next.confirmPassword;
      return next;
    });
  }, []);

  const revertDrafts = useCallback(() => {
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
    setSaveFieldErrors({});
  }, []);

  const revertDraftsRef = useRef(revertDrafts);
  revertDraftsRef.current = revertDrafts;

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const dismiss = presentRef.current({
      onRequestClose: () => {
        const b = blockerRef.current;
        if (b.state === 'blocked') b.reset();
      },
      content: (
        <AlertModal
          title="Unsaved changes"
          message="You have unsaved changes on this page. Leave now and they will be discarded."
          onCancel={() => closeModalRef.current()}
          onContinueWithoutSaving={() => {
            dismiss();
            revertDraftsRef.current();
            const b = blockerRef.current;
            if (b.state === 'blocked') b.proceed();
          }}
        />
      ),
    });
    return dismiss;
  }, [blocker.state]);

  const handleSave = async () => {
    if (!routeUser) return;

    const validationErrors = validateSecurityPasswordSave({
      currentPassword: pwdCurrent,
      newPassword: pwdNew,
      confirmPassword: pwdConfirm,
    });
    const validationMessages = Object.values(validationErrors).flat();
    if (validationMessages.length > 0) {
      setSaveFieldErrors(validationErrors);
      showToast({ type: 'error', message: validationMessages[0] });
      return;
    }
    setSaveFieldErrors({});

    setSaveBusy(true);
    const curPin = pwdCurrent.trim();
    const newPin = pwdNew.trim();
    try {
      await changeUserPassword(routeUser, { currentPin: curPin, newPin });
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      showToast({ type: 'success', message: 'Password updated.' });
      setSaveFieldErrors({});
      void loadSessions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const mapped = securityServerErrorToFieldMap(msg);
      setSaveFieldErrors(mapped);
      showToast({ type: 'error', message: msg });
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="security-page">
      <div className="card card--no-padding">
        <SettingsHeader
          title="Change password"
          actions={
            <>
              <Button
                type="primary"
                text={saveBusy ? 'Saving…' : 'Save'}
                disabled={!routeUser || !hasDirty || saveBusy}
                onClick={() => void handleSave()}
              />
              <Button
                type="secondary"
                text="Cancel"
                disabled={!routeUser || !hasDirty || saveBusy}
                onClick={revertDrafts}
              />
            </>
          }
        />

        <div className="card-padding">
          <div className="security-page__password" id="security-change-password">
            <div className="security-page__field">
              <label htmlFor="security-current-password" className="security-page__label text-b-m">
                Current password
              </label>
              <div className="security-page__control">
                <Input
                  id="security-current-password"
                  size="small"
                  className="security-page__input"
                  type="password"
                  value={pwdCurrent}
                  onChange={(v) => {
                    setPwdCurrent(v);
                    clearAllPasswordSaveErrors();
                  }}
                  placeholder="Required"
                  dismissable
                  submittable={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  disabled={saveBusy}
                  aria-describedby={
                    saveFieldErrors.currentPassword?.length
                      ? 'security-field-error-currentPassword'
                      : undefined
                  }
                />
                <SaveFieldErrors
                  id="security-field-error-currentPassword"
                  messages={saveFieldErrors.currentPassword}
                  className="security-page__field-error"
                />
              </div>
            </div>
            <div className="security-page__field">
              <label htmlFor="security-new-password" className="security-page__label text-b-m">
                New password
              </label>
              <div className="security-page__control">
                <Input
                  id="security-new-password"
                  size="small"
                  className="security-page__input"
                  type="password"
                  value={pwdNew}
                  onChange={(v) => {
                    setPwdNew(v);
                    clearAllPasswordSaveErrors();
                  }}
                  placeholder="Required"
                  dismissable
                  submittable={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="new-password"
                  disabled={saveBusy}
                  aria-describedby={
                    [
                      newPasswordMatchFeedback ? 'security-password-match-hint' : '',
                      saveFieldErrors.newPassword?.length ? 'security-field-error-newPassword' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                />
                {newPasswordMatchFeedback === 'success' ? (
                  <InfoText
                    variant="success"
                    className="security-page__password-match-info"
                    id="security-password-match-hint"
                    aria-live="polite"
                  >
                    Passwords match.
                  </InfoText>
                ) : newPasswordMatchFeedback === 'error' ? (
                  <InfoText
                    variant="error"
                    className="security-page__password-match-info"
                    id="security-password-match-hint"
                    aria-live="polite"
                  >
                    Passwords do not match.
                  </InfoText>
                ) : null}
                <SaveFieldErrors
                  id="security-field-error-newPassword"
                  messages={saveFieldErrors.newPassword}
                  className="security-page__field-error"
                />
              </div>
            </div>
            <div className="security-page__field">
              <label htmlFor="security-confirm-password" className="security-page__label text-b-m">
                Confirm new password
              </label>
              <div className="security-page__control">
                <Input
                  id="security-confirm-password"
                  size="small"
                  className="security-page__input"
                  type="password"
                  value={pwdConfirm}
                  onChange={(v) => {
                    setPwdConfirm(v);
                    clearAllPasswordSaveErrors();
                  }}
                  placeholder="Required"
                  dismissable
                  submittable={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="new-password"
                  disabled={saveBusy}
                  aria-describedby={
                    saveFieldErrors.confirmPassword?.length
                      ? 'security-field-error-confirmPassword'
                      : undefined
                  }
                />
                <SaveFieldErrors
                  id="security-field-error-confirmPassword"
                  messages={saveFieldErrors.confirmPassword}
                  className="security-page__field-error"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card security-page__sessions card--no-padding">
        <SettingsHeader
          title="Sessions"
          titleAs="h3"
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
        />
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
      </div>
    </div>
  );
}
