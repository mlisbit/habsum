// exclusive-bem-block: administrator-options
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router';
import type { FeatureFlagKey } from '@habsum/types/api-responses/feature-flags';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Loader } from '@habsum/ui/components/Loader';
import { useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import {
  getAdministratorEmailSettings,
  updateAdministratorEmailSettings,
  updateFeatureFlag,
  type AdministratorEmailSettingsResponse,
} from '~/api.client';
import { ResendConfig, type ResendConfigHandle } from '~/components/ResendConfig';
import { useFeatureFlags } from '~/context/feature-flags';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { UnsavedChangesModal } from '~/components/UnsavedChangesModal';

type FeatureFlagValues = Partial<Record<FeatureFlagKey, string | null>>;
type EmailProviderName = 'none' | 'resend';

function getFeatureFlagValues(
  flags: readonly { key: FeatureFlagKey; value: string | null }[],
): FeatureFlagValues {
  return Object.fromEntries(flags.map((flag) => [flag.key, flag.value])) as FeatureFlagValues;
}

export default function AdministratorOptions() {
  const { showToast } = useToast();
  const { flags: featureFlags } = useFeatureFlags<FeatureFlagKey>();
  const [emailSettings, setEmailSettings] = useState<AdministratorEmailSettingsResponse | null>(
    null,
  );
  const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);
  const [emailProviderName, setEmailProviderName] = useState<EmailProviderName>('none');
  const [resendConfigDirty, setResendConfigDirty] = useState(false);
  const [draftFeatureFlagValues, setDraftFeatureFlagValues] = useState<FeatureFlagValues>(() =>
    getFeatureFlagValues(featureFlags),
  );
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

  const changedFeatureFlags = useMemo(
    () => featureFlags.filter((flag) => draftFeatureFlagValues[flag.key] !== flag.value),
    [draftFeatureFlagValues, featureFlags],
  );
  const hasDirty = isEmailSettingsDirty || changedFeatureFlags.length > 0;

  const revertDrafts = useCallback(() => {
    if (emailSettings) {
      setEmailProviderName(emailSettings.emailProvider?.name ?? 'none');
    }
    resendConfigRef.current?.reset();
    setResendConfigDirty(false);
    setDraftFeatureFlagValues(getFeatureFlagValues(featureFlags));
    setEmailSettingsError(null);
  }, [emailSettings, featureFlags]);

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

      await Promise.all(
        changedFeatureFlags.map((flag) =>
          updateFeatureFlag({ key: flag.key, value: draftFeatureFlagValues[flag.key] ?? null }),
        ),
      );

      showToast({ type: 'success', message: 'Saved.' });
      if (changedFeatureFlags.length > 0) window.location.reload();
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

      <SettingsPageCard headerText="Feature Flags" className="administrator-options__feature-flags">
        <div className="card-padding">
          {featureFlags.length === 0 ? (
            <p className="text-light text-b-m">No feature flags configured.</p>
          ) : (
            <ul className="administrator-options__feature-flags-list">
              {featureFlags.map((flag) => {
                const selectedValue = draftFeatureFlagValues[flag.key];
                const selectedOption = selectedValue ? flag.options[selectedValue] : undefined;
                return (
                  <li key={flag.key} className="administrator-options__feature-flags-row">
                    <div className="administrator-options__feature-flags-details">
                      <strong className="text-b-m">{flag.name}</strong>
                      <span className="text-light text-b-s">{flag.description}</span>
                    </div>
                    <div className="administrator-options__feature-flag-control">
                      <select
                        className="administrator-options__feature-flag-select text-b-m"
                        aria-label={flag.name}
                        value={selectedValue ?? ''}
                        disabled={saveBusy || sendingTestEmail}
                        onChange={(event) =>
                          setDraftFeatureFlagValues((values) => ({
                            ...values,
                            [flag.key]: event.target.value || null,
                          }))
                        }
                      >
                        <option value="">Disabled</option>
                        {Object.entries(flag.options).map(([value, option]) => (
                          <option key={value} value={value} disabled={option.disabled != null}>
                            {option.text}
                          </option>
                        ))}
                      </select>
                      {selectedOption?.disabled ? (
                        <InfoText size="small" variant="warning" className="mt-1">
                          {selectedOption.disabled}
                        </InfoText>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SettingsPageCard>
    </div>
  );
}
