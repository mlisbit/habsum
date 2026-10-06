// exclusive-bem-block: administrator-options
import { useCallback, useEffect, useState } from 'react';
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
import { useToast } from '@habsum/ui/contexts/toast';
import {
  getAdministratorEmailSettings,
  sendAdministratorTestEmail,
  updateAdministratorEmailSettings,
  updateFeatureFlag,
  type AdministratorEmailSettingsResponse,
} from '~/api.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';
import { useAuth } from '~/context/auth';

function formatUnixTimeLocal(unixSeconds: number | null): string {
  if (unixSeconds == null) return 'Never';
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function AdministratorOptions() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { flags: featureFlags } = useFeatureFlags<FeatureFlagKey>();
  const [emailSettings, setEmailSettings] = useState<AdministratorEmailSettingsResponse | null>(
    null,
  );
  const [emailSettingsError, setEmailSettingsError] = useState<string | null>(null);
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [savingEmailSettings, setSavingEmailSettings] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [updatingFlagKey, setUpdatingFlagKey] = useState<FeatureFlagKey | null>(null);

  const setFeatureFlagEnabled = useCallback(
    async (key: FeatureFlagKey, enabled: boolean) => {
      setUpdatingFlagKey(key);
      try {
        await updateFeatureFlag({
          key,
          value: enabled ? FEATURE_FLAG_ENABLED_VALUE : null,
        });
        window.location.reload();
      } catch (error) {
        setUpdatingFlagKey(null);
        showToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to update feature flag.',
        });
      }
    },
    [showToast],
  );

  useEffect(() => {
    let cancelled = false;
    setEmailSettingsError(null);
    getAdministratorEmailSettings()
      .then((settings) => {
        if (cancelled) return;
        setEmailSettings(settings);
        setResendFromEmail(settings.fromEmail);
        setResendApiKey(settings.apiKey);
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

  const saveEmailSettings = async () => {
    setEmailSettingsError(null);
    setSavingEmailSettings(true);
    try {
      const settings = await updateAdministratorEmailSettings({
        provider: 'resend',
        fromEmail: resendFromEmail.trim(),
        ...(resendApiKey.trim() ? { apiKey: resendApiKey.trim() } : {}),
      });
      setEmailSettings(settings);
      setResendFromEmail(settings.fromEmail);
      setResendApiKey(settings.apiKey);
      showToast({ type: 'success', message: 'Email settings saved.' });
    } catch (error) {
      setEmailSettingsError(
        error instanceof Error ? error.message : 'Failed to save email settings.',
      );
    } finally {
      setSavingEmailSettings(false);
    }
  };

  const sendTestEmail = async () => {
    setEmailSettingsError(null);
    setSendingTestEmail(true);
    try {
      const settings = await updateAdministratorEmailSettings({
        provider: 'resend',
        fromEmail: resendFromEmail.trim(),
        ...(resendApiKey.trim() ? { apiKey: resendApiKey.trim() } : {}),
      });
      setEmailSettings(settings);
      setResendFromEmail(settings.fromEmail);
      setResendApiKey(settings.apiKey);
      const response = await sendAdministratorTestEmail();
      showToast({ type: 'success', message: `Test email sent to ${response.recipient}.` });
    } catch (error) {
      setEmailSettingsError(error instanceof Error ? error.message : 'Failed to send test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const hasResendConfiguration = resendFromEmail.trim() !== '' && resendApiKey.trim() !== '';
  const canSaveEmailSettings = hasResendConfiguration && !savingEmailSettings && !sendingTestEmail;
  const canSendTestEmail =
    user?.email.trim() !== '' &&
    hasResendConfiguration &&
    !savingEmailSettings &&
    !sendingTestEmail;

  return (
    <div className="administrator-options">
      <SettingsPageCard
        headerText="Resend Email Settings"
        className="administrator-options__email-settings"
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
                    disabled={savingEmailSettings || sendingTestEmail}
                    autoComplete="off"
                    aria-label="Resend API key"
                    onChange={setResendApiKey}
                  />
                </div>
                <div className="administrator-options__email-settings-field">
                  <span className="text-b-m text-bold">Email address</span>
                  <Input
                    size="small"
                    value={resendFromEmail}
                    placeholder="auth@example.com"
                    disabled={savingEmailSettings || sendingTestEmail}
                    autoComplete="email"
                    inputMode="email"
                    aria-label="Resend email address"
                    onChange={setResendFromEmail}
                  />
                  <span className="text-light text-b-s">
                    Use an email address verified by Resend.
                  </span>
                </div>
              </div>

              {emailSettingsError ? (
                <InfoText size="small" variant="error">
                  {emailSettingsError}
                </InfoText>
              ) : null}

              <div className="administrator-options__email-settings-actions">
                <Button
                  type="secondary"
                  size="medium"
                  text={sendingTestEmail ? 'Sending…' : 'Send test email'}
                  disabled={!canSendTestEmail}
                  onClick={() => void sendTestEmail()}
                />
                <Button
                  type="primary"
                  size="medium"
                  text={savingEmailSettings ? 'Saving…' : 'Save'}
                  disabled={!canSaveEmailSettings}
                  onClick={() => void saveEmailSettings()}
                />
              </div>
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
                    checked={flag.value != null}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    aria-label={`${flag.key} feature flag`}
                    disabled={updatingFlagKey != null}
                    onChange={(enabled) => void setFeatureFlagEnabled(flag.key, enabled)}
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
