// exclusive-bem-block: security-password-page
import { useBlocker, useNavigate, useParams } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { changeUserPassword } from '~/api.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { UnsavedChangesModal } from '~/components/UnsavedChangesModal';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import {
  securityServerErrorToFieldMap,
  type SecurityErrorMap,
  validateSecurityPasswordSave,
} from '~/utils/validators/security';

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

export default function UserSettingsSecurityPassword() {
  const { user: routeUser } = useParams();
  const navigate = useNavigate();
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveFieldErrors, setSaveFieldErrors] = useState<SecurityErrorMap>({});
  const { showToast } = useToast();

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
        <UnsavedChangesModal
          onKeepEditing={() => closeModalRef.current()}
          onDiscardChanges={() => {
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
    const currentPassword = pwdCurrent.trim();
    const newPassword = pwdNew.trim();
    try {
      await changeUserPassword(routeUser, { currentPassword, newPassword });
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      showToast({ type: 'success', message: 'Password updated.' });
      setSaveFieldErrors({});
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
    <div className="security-password-page">
      {hasDirty ? (
        <div className="flex justify-space-between">
          <InfoText size="medium" variant="warning" className="security-password-page__info">
            You have unsaved changes.
          </InfoText>
          <div className="security-password-page__actions">
            <Button
              type="tertiary"
              text="Cancel"
              disabled={!routeUser || saveBusy}
              onClick={revertDrafts}
            />
            <Button
              type="primary"
              text={saveBusy ? 'Saving…' : 'Save'}
              disabled={!routeUser || saveBusy}
              onClick={() => void handleSave()}
            />
          </div>
        </div>
      ) : null}

      <SettingsPageCard
        headerText="Change password"
        onBack={() => navigate(`/users/${encodeURIComponent(routeUser ?? '')}/settings/security`)}
      >
        <div className="card-padding">
          <div className="security-password-page__password" id="security-change-password">
            <div className="security-password-page__field">
              <label
                htmlFor="security-current-password"
                className="security-password-page__label text-b-m"
              >
                Current password
              </label>
              <div className="security-password-page__control">
                <Input
                  id="security-current-password"
                  size="small"
                  className="security-password-page__input"
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
                  className="security-password-page__field-error"
                />
              </div>
            </div>
            <div className="security-password-page__field">
              <label
                htmlFor="security-new-password"
                className="security-password-page__label text-b-m"
              >
                New password
              </label>
              <div className="security-password-page__control">
                <Input
                  id="security-new-password"
                  size="small"
                  className="security-password-page__input"
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
                    size="small"
                    variant="success"
                    className="security-password-page__password-match-info"
                    id="security-password-match-hint"
                    aria-live="polite"
                  >
                    Passwords match.
                  </InfoText>
                ) : newPasswordMatchFeedback === 'error' ? (
                  <InfoText
                    size="small"
                    variant="error"
                    className="security-password-page__password-match-info"
                    id="security-password-match-hint"
                    aria-live="polite"
                  >
                    Passwords do not match.
                  </InfoText>
                ) : null}
                <SaveFieldErrors
                  id="security-field-error-newPassword"
                  messages={saveFieldErrors.newPassword}
                  className="security-password-page__field-error"
                />
              </div>
            </div>
            <div className="security-password-page__field">
              <label
                htmlFor="security-confirm-password"
                className="security-password-page__label text-b-m"
              >
                Confirm new password
              </label>
              <div className="security-password-page__control">
                <Input
                  id="security-confirm-password"
                  size="small"
                  className="security-password-page__input"
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
                  className="security-password-page__field-error"
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsPageCard>
    </div>
  );
}
