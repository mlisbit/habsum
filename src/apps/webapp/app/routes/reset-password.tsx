// exclusive-bem-block: reset-password-page
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import type { PasswordResetTokenPurpose } from '@habsum/types/api-responses/reset-password-get';
import { submitResetPassword, validateResetPasswordToken } from '~/api.client';
import { Footer } from '~/components/Footer';
import { HomeLink } from '~/components/HomeLink';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { useToast } from '@habsum/ui/contexts/toast';
import { userDefaultAppPath } from '~/utils/user-session-guard';
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
    <InfoText size="small" variant="error" className={className} id={id} aria-live="polite">
      {messages.join(' ')}
    </InfoText>
  );
}

export default function ResetPasswordRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const { showToast } = useToast();

  const [tokenState, setTokenState] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [tokenPurpose, setTokenPurpose] = useState<PasswordResetTokenPurpose>('reset');
  const [inviteDisplayName, setInviteDisplayName] = useState<string | null>(null);
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveFieldErrors, setSaveFieldErrors] = useState<NewPasswordErrorMap>({});

  const newPasswordMatchFeedback = useMemo((): 'success' | 'error' | null => {
    const next = pwdNew.trim();
    const again = pwdConfirm.trim();
    if (!next || !again) return null;
    return next === again ? 'success' : 'error';
  }, [pwdNew, pwdConfirm]);

  useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      return;
    }

    let cancelled = false;
    void validateResetPasswordToken(token)
      .then((res) => {
        if (!cancelled) {
          setTokenPurpose(res.purpose);
          setInviteDisplayName(res.purpose === 'invite' ? (res.displayName ?? null) : null);
          setTokenState('valid');
        }
      })
      .catch(() => {
        if (!cancelled) setTokenState('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const isInvite = tokenPurpose === 'invite';
  const inviteGreetingName = inviteDisplayName?.trim() || null;
  const pageTitle = isInvite
    ? inviteGreetingName
      ? `Welcome, ${inviteGreetingName}`
      : 'Set up your account'
    : 'Reset password';
  const loadingHint = isInvite ? 'Checking invite link…' : 'Checking reset link…';
  const invalidMessage = isInvite
    ? 'This invite link is invalid or has expired.'
    : 'This reset link is invalid or has expired.';
  const validHint = isInvite
    ? inviteGreetingName
      ? `Hi ${inviteGreetingName}, choose a password for your Habsum account.`
      : 'Choose a password for your new Habsum account.'
    : 'Choose a new password for your account.';
  const successMessage = isInvite ? 'Welcome to Habsum!' : 'Password updated. You can log in now.';

  const handleSave = async () => {
    if (!token) return;

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
    const newPassword = pwdNew.trim();
    try {
      const res = await submitResetPassword({ token, newPassword });
      showToast({ type: 'success', message: successMessage });
      if (res.user) {
        window.location.assign(userDefaultAppPath(res.user));
        return;
      }
      navigate('/login');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const mapped = newPasswordServerErrorToFieldMap(msg);
      setSaveFieldErrors(mapped);
      showToast({ type: 'error', message: msg });
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="users-index">
      <HomeLink />
      <div className="users-index__main">
        <div className="card users-index__card">
          <div className="users-index__header">
            <h1 className="text-h-l">{pageTitle}</h1>
          </div>

          {tokenState === 'loading' ? (
            <p className="text-b-m users-index__hint">{loadingHint}</p>
          ) : null}

          {tokenState === 'invalid' ? (
            <>
              <InfoText size="small" className="mt-1 mb-1" variant="error">
                {invalidMessage}
              </InfoText>
              {!isInvite ? (
                <Link to="/forgot-password" className="text-b-s text-link users-index__back-link">
                  Request a new reset link
                </Link>
              ) : null}
            </>
          ) : null}

          {tokenState === 'valid' ? (
            <>
              <p className="text-b-m users-index__hint">{validHint}</p>
              <form
                className="users-index__login-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
                <div className="reset-password-page__field">
                  <label htmlFor="reset-password" className="reset-password-page__label text-b-m">
                    New password
                  </label>
                  <div className="reset-password-page__control">
                    <Input
                      id="reset-password"
                      size="small"
                      className="reset-password-page__input"
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
                    />
                    <SaveFieldErrors
                      id="reset-password-field-error"
                      messages={saveFieldErrors.newPassword}
                      className="reset-password-page__field-error"
                    />
                  </div>
                </div>

                <div className="reset-password-page__field">
                  <label
                    htmlFor="reset-password-confirm"
                    className="reset-password-page__label text-b-m"
                  >
                    Confirm new password
                  </label>
                  <div className="reset-password-page__control">
                    <Input
                      id="reset-password-confirm"
                      size="small"
                      className="reset-password-page__input"
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
                    />
                    {newPasswordMatchFeedback === 'success' ? (
                      <InfoText
                        size="small"
                        variant="success"
                        className="reset-password-page__password-match-info"
                      >
                        Passwords match.
                      </InfoText>
                    ) : newPasswordMatchFeedback === 'error' ? (
                      <InfoText
                        size="small"
                        variant="error"
                        className="reset-password-page__password-match-info"
                      >
                        Passwords do not match.
                      </InfoText>
                    ) : null}
                    <SaveFieldErrors
                      id="reset-password-confirm-field-error"
                      messages={saveFieldErrors.confirmPassword}
                      className="reset-password-page__field-error"
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
            </>
          ) : null}

          {tokenState === 'valid' && !isInvite ? (
            <Link to="/login" className="text-b-s text-link users-index__back-link">
              Back to login
            </Link>
          ) : null}
        </div>
      </div>

      <Footer />
    </div>
  );
}
