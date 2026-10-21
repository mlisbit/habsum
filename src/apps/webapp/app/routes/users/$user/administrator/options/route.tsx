// exclusive-bem-block: administrator-options
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Loader } from '@habsum/ui/components/Loader';
import { useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import {
  getAdministratorEmailSettings,
  updateAdministratorEmailSettings,
  getAdministratorApplicationSettings,
  updateAdministratorApplicationSettings,
  type AdministratorEmailSettingsResponse,
} from '~/api.client';
import { ResendConfig, type ResendConfigHandle } from '~/components/ResendConfig';
import { useAuth } from '~/context/auth';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { UnsavedChangesModal } from '~/components/UnsavedChangesModal';

type EmailProviderName = 'none' | 'resend';

export default function AdministratorOptions() {
  const { showToast } = useToast();
  const { refresh } = useAuth();
  const [savedAccountSignup, setSavedAccountSignup] = useState<boolean | null>(null);
  const [accountSignup, setAccountSignup] = useState(false);
  const [applicationSettingsError, setApplicationSettingsError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getAdministratorApplicationSettings()
      .then((settings) => {
        if (cancelled) return;
        setSavedAccountSignup(settings.accountSignup);
        setAccountSignup(settings.accountSignup);
      })
      .catch((error) => {
        if (!cancelled)
          setApplicationSettingsError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [emailSettings, setEmailSettings] = useState<AdministratorEmailSettingsResponse | null>(
    null,
  );
  const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);
  const [emailProviderName, setEmailProviderName] = useState<EmailProviderName>('none');
  const [resendConfigDirty, setResendConfigDirty] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const { present, closeModal } = useModal();
  const resendConfigRef = useRef<ResendConfigHandle>(null);

  useEffect(() => {
    let cancelled = false;
    setEmailSettingsError(null);
    getAdministratorEmailSettings()
      .then((settings) => {
        if (cancelled) return;
        setEmailSettings(settings);
        setEmailProviderName(settings.emailProvider?.name ?? 'none');
      })
      .catch((error) => {
        if (cancelled) return;
        setEmailSettings(null);
        setEmailSettingsError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isEmailSettingsDirty = useMemo(() => {
    if (!emailSettings) return false;
    const savedEmailProviderName = emailSettings.emailProvider?.name ?? 'none';
    return (
      emailProviderName !== savedEmailProviderName ||
      (emailProviderName === 'resend' && resendConfigDirty)
    );
  }, [emailProviderName, emailSettings, resendConfigDirty]);

  const isApplicationSettingsDirty =
    savedAccountSignup !== null && accountSignup !== savedAccountSignup;
  const hasDirty = isEmailSettingsDirty || isApplicationSettingsDirty;

  const revertDrafts = useCallback(() => {
    if (emailSettings) {
      setEmailProviderName(emailSettings.emailProvider?.name ?? 'none');
    }
    resendConfigRef.current?.reset();
    setResendConfigDirty(false);
    if (savedAccountSignup !== null) setAccountSignup(savedAccountSignup);
    setEmailSettingsError(null);
  }, [emailSettings, savedAccountSignup]);

  const blocker = useBlocker(hasDirty);
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const presentRef = useRef(present);
  presentRef.current = present;
  const closeModalRef = useRef(closeModal);
  closeModalRef.current = closeModal;
  const revertDraftsRef = useRef(revertDrafts);
  revertDraftsRef.current = revertDrafts;

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const dismiss = presentRef.current({
      onRequestClose: () => {
        const currentBlocker = blockerRef.current;
        if (currentBlocker.state === 'blocked') currentBlocker.reset();
      },
      content: (
        <UnsavedChangesModal
          onKeepEditing={() => closeModalRef.current()}
          onDiscardChanges={() => {
            dismiss();
            revertDraftsRef.current();
            const currentBlocker = blockerRef.current;
            if (currentBlocker.state === 'blocked') currentBlocker.proceed();
          }}
        />
      ),
    });
    return dismiss;
  }, [blocker.state]);

  const handleSave = async () => {
    if (!hasDirty || saveBusy) return;
    const resendRequest =
      isEmailSettingsDirty && emailProviderName === 'resend'
        ? resendConfigRef.current?.getValidatedRequest()
        : undefined;
    if (isEmailSettingsDirty && emailProviderName === 'resend' && !resendRequest) return;

    setEmailSettingsError(null);
    setSaveBusy(true);
    let emailRequestPending = false;
    try {
      if (isEmailSettingsDirty) {
        emailRequestPending = true;
        const settings = await updateAdministratorEmailSettings(
          emailProviderName === 'resend' ? { emailProvider: resendRequest! } : {},
        );
        emailRequestPending = false;
        setEmailSettings(settings);
        setEmailProviderName(settings.emailProvider?.name ?? 'none');
        setResendConfigDirty(false);
      }

      if (isApplicationSettingsDirty) {
        const settings = await updateAdministratorApplicationSettings({ accountSignup });
        setSavedAccountSignup(settings.accountSignup);
        setAccountSignup(settings.accountSignup);
      }
      await refresh();
      showToast({ type: 'success', message: 'Saved.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings.';
      if (emailRequestPending && emailProviderName === 'resend') {
        resendConfigRef.current?.showServerError(error, 'Failed to save email settings.');
      } else if (emailRequestPending) {
        setEmailSettingsError(message);
      }
      showToast({ type: 'error', message });
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="administrator-options">
      {hasDirty ? (
        <div className="flex justify-space-between">
          <InfoText size="medium" variant="warning" className="administrator-options__info">
            You have unsaved changes.
          </InfoText>
          <div className="administrator-options__actions">
            <Button
              type="tertiary"
              text="Cancel"
              disabled={saveBusy || sendingTestEmail}
              onClick={revertDrafts}
            />
            <Button
              type="primary"
              text={saveBusy ? 'Saving…' : 'Save'}
              disabled={saveBusy || sendingTestEmail}
              onClick={() => void handleSave()}
            />
          </div>
        </div>
      ) : null}

      <SettingsPageCard
        headerText="Email Settings"
        subtitle="Email is optional. Configure an email provider to send user notifications and allow users to reset their own passwords."
        className="administrator-options__email-settings"
        actions={
          emailSettings != null ? (
            <select
              id="administrator-email-provider"
              className="administrator-options__email-provider-select text-b-m"
              aria-label="Email provider"
              value={emailProviderName}
              disabled={saveBusy || sendingTestEmail}
              onChange={(event) => {
                setEmailProviderName(event.target.value as EmailProviderName);
                setResendConfigDirty(false);
                setEmailSettingsError(null);
              }}
            >
              <option value="none">None</option>
              <option value="resend">Resend</option>
            </select>
          ) : undefined
        }
      >
        {emailSettings == null && emailSettingsError == null ? (
          <div className="card-padding">
            <Loader
              className="administrator-options__email-settings-loader"
              label="Loading email settings"
              size="medium"
            />
          </div>
        ) : emailProviderName === 'resend' && emailSettings != null ? (
          <ResendConfig
            ref={resendConfigRef}
            emailSettings={emailSettings}
            disabled={saveBusy}
            onDirtyChange={setResendConfigDirty}
            onSendingChange={setSendingTestEmail}
          />
        ) : emailSettingsError ? (
          <div className="card-padding">
            <InfoText size="small" variant="error">
              {emailSettingsError}
            </InfoText>
          </div>
        ) : null}
      </SettingsPageCard>

      <SettingsPageCard headerText="Features">
        <div className="card-padding">
          {applicationSettingsError ? (
            <InfoText size="small" variant="error">
              {applicationSettingsError}
            </InfoText>
          ) : null}
          <div className="administrator-options__feature-row">
            <div className="administrator-options__feature-details">
              <label htmlFor="administrator-user-registration" className="text-b-m">
                User registration
              </label>
              <span className="text-light text-b-s">Allow users to create their own accounts.</span>
            </div>
            <select
              id="administrator-user-registration"
              className="administrator-options__registration-select text-b-m"
              aria-label="User registration"
              value={accountSignup ? 'enabled' : 'disabled'}
              disabled={savedAccountSignup === null || saveBusy || sendingTestEmail}
              onChange={(event) => setAccountSignup(event.target.value === 'enabled')}
            >
              <option value="disabled">Disabled</option>
              <option value="enabled">Enabled</option>
            </select>
          </div>
        </div>
      </SettingsPageCard>
    </div>
  );
}
