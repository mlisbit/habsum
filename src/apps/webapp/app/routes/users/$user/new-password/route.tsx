// exclusive-bem-block: new-password-page
import { useParams } from '@remix-run/react';
import { useEffect, useMemo, useState } from 'react';
import { getAuthMe, setUserNewPassword } from '~/api.client';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { useToast } from '~/context/toast';
import { applyUiTheme } from '~/theme.client';
import {
  ensureUserSessionForRoute,
  isMeLoggedIn,
  userDefaultAppPath,
} from '~/utils/user-session-guard';
import {
  newPasswordServerErrorToFieldMap,
  type NewPasswordErrorMap,
  validateNewPasswordSave,
} from '~/utils/validators/new-password';

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

export default function UserNewPasswordRoute() {
  const { user: routeUser } = useParams();
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveFieldErrors, setSaveFieldErrors] = useState<NewPasswordErrorMap>({});
  const [authReady, setAuthReady] = useState(false);
  const { showToast } = useToast();

  const newPasswordMatchFeedback = useMemo((): 'success' | 'error' | null => {
    const next = pwdNew.trim();
    const again = pwdConfirm.trim();
    if (!next || !again) return null;
    return next === again ? 'success' : 'error';
  }, [pwdNew, pwdConfirm]);

  useEffect(() => {
    if (!routeUser) return;
    let cancelled = false;
    getAuthMe()
      .then((me) => {
        if (cancelled) return;
        if (!ensureUserSessionForRoute(routeUser, me, { allowNewPasswordRoute: true })) return;
        applyUiTheme(isMeLoggedIn(me) ? me.theme : 'dark');
        setAuthReady(true);
      })
      .catch(() => {
        if (!cancelled) window.location.replace('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [routeUser]);

  const handleSave = async () => {
    if (!routeUser) return;

    const validationErrors = validateNewPasswordSave({
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
    const newPin = pwdNew.trim();
    try {
      await setUserNewPassword(routeUser, { newPin });
      showToast({ type: 'success', message: 'Password updated.' });
      window.location.assign(userDefaultAppPath(routeUser, false));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const mapped = newPasswordServerErrorToFieldMap(msg);
      setSaveFieldErrors(mapped);
      showToast({ type: 'error', message: msg });
    } finally {
      setSaveBusy(false);
    }
  };

  if (!routeUser || !authReady) {
    return null;
  }

  return (
    <div className="users-index">
      <div className="card users-index__card">
        <div className="users-index__header">
          <h1 className="text-h-l">Choose a new password</h1>
        </div>
        <p className="text-b-m users-index__hint">
          Your account must use a new login password before you can continue.
        </p>
        <form
          className="users-index__login-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div className="new-password-page__field">
            <label htmlFor="new-password" className="new-password-page__label text-b-m">
              New password
            </label>
            <div className="new-password-page__control">
              <Input
                id="new-password"
                size="small"
                className="new-password-page__input"
                type="password"
                value={pwdNew}
                onChange={(v) => {
                  setPwdNew(v);
                  setSaveFieldErrors({});
                }}
                placeholder="Required"
                dismissable
                submittable={false}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="new-password"
                aria-describedby={
                  [
                    newPasswordMatchFeedback ? 'new-password-match-hint' : '',
                    saveFieldErrors.newPassword?.length ? 'new-password-field-error' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              {newPasswordMatchFeedback === 'success' ? (
                <InfoText
                  variant="success"
                  className="new-password-page__password-match-info"
                  id="new-password-match-hint"
                >
                  Passwords match.
                </InfoText>
              ) : newPasswordMatchFeedback === 'error' ? (
                <InfoText
                  variant="error"
                  className="new-password-page__password-match-info"
                  id="new-password-match-hint"
                >
                  Passwords do not match.
                </InfoText>
              ) : null}
              <SaveFieldErrors
                id="new-password-field-error"
                messages={saveFieldErrors.newPassword}
                className="new-password-page__field-error"
              />
            </div>
          </div>

          <div className="new-password-page__field">
            <label htmlFor="confirm-password" className="new-password-page__label text-b-m">
              Confirm new password
            </label>
            <div className="new-password-page__control">
              <Input
                id="confirm-password"
                size="small"
                className="new-password-page__input"
                type="password"
                value={pwdConfirm}
                onChange={(v) => {
                  setPwdConfirm(v);
                  setSaveFieldErrors({});
                }}
                placeholder="Required"
                dismissable
                submittable={false}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="new-password"
                aria-describedby={
                  saveFieldErrors.confirmPassword?.length
                    ? 'confirm-password-field-error'
                    : undefined
                }
              />
              <SaveFieldErrors
                id="confirm-password-field-error"
                messages={saveFieldErrors.confirmPassword}
                className="new-password-page__field-error"
              />
            </div>
          </div>

          <button type="submit" style={{ display: 'none' }} aria-hidden />

          <Button
            type="primary"
            size="medium"
            text={saveBusy ? 'Saving…' : 'Save password'}
            disabled={
              saveBusy ||
              pwdNew.trim() === '' ||
              pwdConfirm.trim() === '' ||
              newPasswordMatchFeedback === 'error'
            }
            onClick={() => void handleSave()}
          />
        </form>
      </div>
    </div>
  );
}
