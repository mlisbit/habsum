// exclusive-bem-block: administrator-options
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router';
import { useFeatureFlags } from '@habsum/feature-flags/client/react';
import {
  FEATURE_FLAG_ENABLED_VALUE,
  type FeatureFlagKey,
} from '@habsum/feature-flags/feature-flags';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { Loader } from '@habsum/ui/components/Loader';
import { Toggle } from '@habsum/ui/components/Toggle';
import { useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import {
  getAdministratorEmailSettings,
  sendAdministratorTestEmail,
  updateAdministratorEmailSettings,
  updateFeatureFlag,
  type AdministratorEmailSettingsResponse,
} from '~/api.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { UnsavedChangesModal } from '~/components/UnsavedChangesModal';
import { useAuth } from '~/context/auth';

type FeatureFlagValues = Partial<Record<FeatureFlagKey, string | null>>;
type EmailFieldErrors = {
  apiKey?: string;
  fromEmail?: string;
};

function getFeatureFlagValues(
  flags: readonly { key: FeatureFlagKey; value: string | null }[],
): FeatureFlagValues {
  return Object.fromEntries(flags.map((flag) => [flag.key, flag.value])) as FeatureFlagValues;
}

function formatUnixTimeLocal(unixSeconds: number | null): string {
  if (unixSeconds == null) return 'Never';
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function AdministratorOptions() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { flags: featureFlags } = useFeatureFlags<FeatureFlagKey>();
  const [emailSettings, setEmailSettings] = useState<AdministratorEmailSettingsResponse | null>(
    null,
  );
  const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);
  const [emailFieldErrors, setEmailFieldErrors] = useState<EmailFieldErrors>({});
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [draftFeatureFlagValues, setDraftFeatureFlagValues] = useState<FeatureFlagValues>(() =>
    getFeatureFlagValues(featureFlags),
  );
  const [saveBusy, setSaveBusy] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const { present, closeModal } = useModal();

  useEffect(() => {
    let cancelled = false;
    setEmailSettingsError(null);
    getAdministratorEmailSettings()
      .then((settings) => {
        if (cancelled) return;
        setEmailSettings(settings);
        setResendFromEmail(settings.emailProvider?.email ?? '');
        setResendApiKey(settings.emailProvider?.apiKey ?? '');
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
    return (
      resendApiKey.trim() !== (emailSettings.emailProvider?.apiKey ?? '') ||
      resendFromEmail.trim().toLowerCase() !==
        (emailSettings.emailProvider?.email ?? '').toLowerCase()
    );
  }, [emailSettings, resendApiKey, resendFromEmail]);

  const changedFeatureFlags = useMemo(
    () => featureFlags.filter((flag) => draftFeatureFlagValues[flag.key] !== flag.value),
    [draftFeatureFlagValues, featureFlags],
  );
  const hasDirty = isEmailSettingsDirty || changedFeatureFlags.length > 0;

  const revertDrafts = useCallback(() => {
    if (emailSettings) {
      setResendApiKey(emailSettings.emailProvider?.apiKey ?? '');
      setResendFromEmail(emailSettings.emailProvider?.email ?? '');
    }
    setDraftFeatureFlagValues(getFeatureFlagValues(featureFlags));
    setEmailSettingsError(null);
    setEmailFieldErrors({});
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
    if (isEmailSettingsDirty) {
      const nextFieldErrors: EmailFieldErrors = {};
      const hasApiKey = resendApiKey.trim() !== '';
      const hasFromEmail = resendFromEmail.trim() !== '';
      if (!hasApiKey && hasFromEmail) {
        nextFieldErrors.apiKey = 'Resend API key is required.';
      }
      if (hasApiKey && !hasFromEmail) {
        nextFieldErrors.fromEmail = 'Email address is required.';
      } else if (hasFromEmail && !isPlausibleEmail(resendFromEmail)) {
        nextFieldErrors.fromEmail = 'Enter a valid email address.';
      }
      if (Object.keys(nextFieldErrors).length > 0) {
        setEmailFieldErrors(nextFieldErrors);
        return;
      }
    }

    setEmailSettingsError(null);
    setEmailFieldErrors({});
    setSaveBusy(true);
    try {
      if (isEmailSettingsDirty) {
        const settings = await updateAdministratorEmailSettings({
          emailProvider: {
            name: 'resend',
            email: resendFromEmail.trim() || undefined,
            apiKey: resendApiKey.trim() || undefined,
          },
        });
        setEmailSettings(settings);
        setResendFromEmail(settings.emailProvider?.email ?? '');
        setResendApiKey(settings.emailProvider?.apiKey ?? '');
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
      if (message.toLowerCase().includes('api key')) {
        setEmailFieldErrors({ apiKey: message });
      } else if (message.toLowerCase().includes('email')) {
        setEmailFieldErrors({ fromEmail: message });
      } else {
        setEmailSettingsError(message);
      }
      showToast({ type: 'error', message });
    } finally {
      setSaveBusy(false);
    }
  };

  const sendTestEmail = async () => {
    setEmailSettingsError(null);
    setSendingTestEmail(true);
    try {
      const response = await sendAdministratorTestEmail({
        emailProvider: {
          name: 'resend',
          apiKey: resendApiKey.trim(),
          email: resendFromEmail.trim(),
        },
      });
      showToast({ type: 'success', message: `Test email sent to ${response.recipient}.` });
    } catch (error) {
      setEmailSettingsError(error instanceof Error ? error.message : 'Failed to send test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const hasDraftEmailSettings = resendApiKey.trim() !== '' && resendFromEmail.trim() !== '';
  const canSendTestEmail =
    user?.email.trim() !== '' &&
    hasDraftEmailSettings &&
    isPlausibleEmail(resendFromEmail) &&
    !saveBusy &&
    !sendingTestEmail;

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
        headerText="Resend Email Settings"
        className="administrator-options__email-settings"
        actions={
          hasDraftEmailSettings ? (
            <Button
              type="secondary"
              size="medium"
              text={sendingTestEmail ? 'Sending…' : 'Send test email'}
              disabled={!canSendTestEmail}
              onClick={() => void sendTestEmail()}
            />
          ) : undefined
        }
      >
        <div className="card-padding administrator-options__email-settings-content">
          {emailSettings == null && emailSettingsError == null ? (
            <Loader
              className="administrator-options__email-settings-loader"
              label="Loading email settings"
              size="medium"
            />
          ) : (
            <>
              <div className="administrator-options__email-settings-fields">
                <div className="administrator-options__email-settings-field">
                  <span className="text-b-m text-bold">Resend API key</span>
                  <Input
                    size="small"
                    value={resendApiKey}
                    placeholder="re_…"
                    disabled={saveBusy || sendingTestEmail}
                    autoComplete="off"
                    aria-label="Resend API key"
                    aria-describedby={emailFieldErrors.apiKey ? 'resend-api-key-error' : undefined}
                    onChange={(value) => {
                      setResendApiKey(value);
                      setEmailFieldErrors((errors) => ({ ...errors, apiKey: undefined }));
                      setEmailSettingsError(null);
                    }}
                  />
                  {emailFieldErrors.apiKey ? (
                    <InfoText size="small" variant="error" id="resend-api-key-error">
                      {emailFieldErrors.apiKey}
                    </InfoText>
                  ) : null}
                </div>
                <div className="administrator-options__email-settings-field">
                  <span className="text-b-m text-bold">Email address</span>
                  <Input
                    size="small"
                    value={resendFromEmail}
                    placeholder="auth@example.com"
                    disabled={saveBusy || sendingTestEmail}
                    autoComplete="email"
                    inputMode="email"
                    aria-label="Resend email address"
                    aria-describedby={
                      emailFieldErrors.fromEmail ? 'resend-email-address-error' : undefined
                    }
                    onChange={(value) => {
                      setResendFromEmail(value);
                      setEmailFieldErrors((errors) => ({ ...errors, fromEmail: undefined }));
                      setEmailSettingsError(null);
                    }}
                    onBlur={() => {
                      const value = resendFromEmail.trim();
                      setEmailFieldErrors((errors) => ({
                        ...errors,
                        fromEmail:
                          value === ''
                            ? resendApiKey.trim() === ''
                              ? undefined
                              : 'Email address is required.'
                            : isPlausibleEmail(value)
                              ? undefined
                              : 'Enter a valid email address.',
                      }));
                    }}
                  />
                  {emailFieldErrors.fromEmail ? (
                    <InfoText size="small" variant="error" id="resend-email-address-error">
                      {emailFieldErrors.fromEmail}
                    </InfoText>
                  ) : null}
                </div>
              </div>

              {emailSettingsError ? (
                <InfoText size="small" variant="error">
                  {emailSettingsError}
                </InfoText>
              ) : null}
            </>
          )}
        </div>
      </SettingsPageCard>

      <SettingsPageCard headerText="Feature Flags" className="administrator-options__feature-flags">
        <div className="card-padding">
          {featureFlags.length === 0 ? (
            <p className="text-light text-b-m">No feature flags configured.</p>
          ) : (
            <ul className="administrator-options__feature-flags-list">
              {featureFlags.map((flag) => (
                <li key={flag.key} className="administrator-options__feature-flags-row">
                  <div className="administrator-options__feature-flags-details">
                    <code className="text-b-m">{flag.key}</code>
                    <span className="text-light text-b-s">
                      Last modified: {formatUnixTimeLocal(flag.lastModifiedAt)}
                    </span>
                  </div>
                  <Toggle
                    checked={draftFeatureFlagValues[flag.key] != null}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    aria-label={`${flag.key} feature flag`}
                    disabled={saveBusy || sendingTestEmail}
                    onChange={(enabled) =>
                      setDraftFeatureFlagValues((values) => ({
                        ...values,
                        [flag.key]: enabled ? FEATURE_FLAG_ENABLED_VALUE : null,
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsPageCard>
    </div>
  );
}
