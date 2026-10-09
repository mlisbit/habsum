// exclusive-bem-block: resend-config
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { AdministratorEmailTestRequest } from '@habsum/types/api-responses/administrator-email-settings';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { ModalBody, ModalFooter, ModalHeader, useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import { sendAdministratorTestEmail, type AdministratorEmailSettingsResponse } from '~/api.client';
import { useAuth } from '~/context/auth';
import EmailConfigurationValidator, {
  type EmailConfigurationFieldErrors,
  type EmailConfigurationFormValues,
} from '~/utils/validators/email-configuration-validator';

const validator = new EmailConfigurationValidator();

function getInitialValues(
  emailSettings: AdministratorEmailSettingsResponse,
): EmailConfigurationFormValues {
  return {
    apiKey: emailSettings.emailProvider?.apiKey ?? '',
    email: emailSettings.emailProvider?.email ?? '',
  };
}

function getErrorMessage(cause: unknown, fallbackMessage: string): string {
  return cause instanceof Error ? cause.message : fallbackMessage;
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function SendTestEmailModal({
  initialRecipient,
  onSend,
}: {
  initialRecipient: string;
  onSend: (recipient: string) => Promise<void>;
}) {
  const { closeModal } = useModal();
  const [recipient, setRecipient] = useState(initialRecipient);
  const [recipientError, setRecipientError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (sending) return;
    const normalizedRecipient = recipient.trim();
    if (!normalizedRecipient) {
      setRecipientError('Recipient email is required.');
      return;
    }
    if (!isPlausibleEmail(normalizedRecipient)) {
      setRecipientError('Enter a valid email address.');
      return;
    }

    setSending(true);
    await onSend(normalizedRecipient);
    closeModal();
  };

  return (
    <>
      <ModalHeader dismissDisabled={sending}>Send test email</ModalHeader>
      <ModalBody className="resend-config__test-modal">
        <label className="text-b-m text-bold" htmlFor="resend-test-recipient">
          Recipient email
        </label>
        <Input
          id="resend-test-recipient"
          size="small"
          value={recipient}
          error={recipientError}
          disabled={sending}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(value) => {
            setRecipient(value);
            setRecipientError(undefined);
          }}
          onBlur={() => {
            if (recipient.trim() && !isPlausibleEmail(recipient.trim())) {
              setRecipientError('Enter a valid email address.');
            }
          }}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          type="secondary"
          size="medium"
          text="Cancel"
          disabled={sending}
          className="mr-2"
          onClick={closeModal}
        />
        <Button
          type="primary"
          size="medium"
          text={sending ? 'Sending…' : 'Send email'}
          disabled={sending}
          onClick={() => void submit()}
        />
      </ModalFooter>
    </>
  );
}

export type ResendConfigHandle = {
  getValidatedRequest: () => AdministratorEmailTestRequest['emailProvider'] | null;
  reset: () => void;
  showServerError: (cause: unknown, fallbackMessage: string) => void;
};

type ResendConfigProps = {
  emailSettings: AdministratorEmailSettingsResponse;
  disabled: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSendingChange: (sending: boolean) => void;
};

export const ResendConfig = forwardRef<ResendConfigHandle, ResendConfigProps>(function ResendConfig(
  { emailSettings, disabled, onDirtyChange, onSendingChange },
  ref,
) {
  const { showToast } = useToast();
  const { present } = useModal();
  const { user } = useAuth();
  const initialValues = useMemo(() => getInitialValues(emailSettings), [emailSettings]);
  const [values, setValues] = useState<EmailConfigurationFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<EmailConfigurationFieldErrors>({});
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const isDirty =
    values.apiKey.trim() !== initialValues.apiKey ||
    values.email.trim().toLowerCase() !== initialValues.email.toLowerCase();

  const reset = useCallback(() => {
    setValues(initialValues);
    setFieldErrors({});
    setConfigurationError(null);
  }, [initialValues]);

  const getValidatedRequest = useCallback(() => {
    const validation = validator.validate(values);
    setFieldErrors(validation.errors);
    setConfigurationError(null);
    return Object.keys(validation.errors).length > 0 ? null : validation.request;
  }, [values]);

  const showServerError = useCallback(
    (cause: unknown, fallbackMessage: string) => {
      const validation = validator.getServerErrorResult(values, cause);
      if (Object.keys(validation.errors).length > 0) {
        setFieldErrors(validation.errors);
        setConfigurationError(null);
        return;
      }
      setConfigurationError(getErrorMessage(cause, fallbackMessage));
    },
    [values],
  );

  useImperativeHandle(ref, () => ({ getValidatedRequest, reset, showServerError }), [
    getValidatedRequest,
    reset,
    showServerError,
  ]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onSendingChange(sendingTestEmail);
  }, [onSendingChange, sendingTestEmail]);

  useEffect(
    () => () => {
      onDirtyChange(false);
      onSendingChange(false);
    },
    [onDirtyChange, onSendingChange],
  );

  const setValue = (field: keyof EmailConfigurationFormValues, value: string) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((errors) => {
      const nextErrors = { ...errors };
      delete nextErrors[field];
      return nextErrors;
    });
    setConfigurationError(null);
  };

  const sendTestEmail = async (recipient: string): Promise<void> => {
    if (disabled || sendingTestEmail) return;
    const request = getValidatedRequest();
    if (!request) return;

    setSendingTestEmail(true);
    try {
      const response = await sendAdministratorTestEmail({ recipient, emailProvider: request });
      showToast({ type: 'success', message: `Test email sent to ${response.recipient}.` });
    } catch (cause) {
      showServerError(cause, 'Failed to send test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const accountEmail = user?.email.trim() ?? '';
  const openTestEmailModal = () => {
    if (disabled || sendingTestEmail) return;
    if (!getValidatedRequest()) return;
    present({
      history: false,
      content: <SendTestEmailModal initialRecipient={accountEmail} onSend={sendTestEmail} />,
    });
  };

  return (
    <div className="card-padding resend-config">
      <div className="resend-config__fields">
        <div className="resend-config__field">
          <label className="resend-config__label text-b-m text-bold" htmlFor="resend-api-key">
            Resend API key
          </label>
          <div className="resend-config__control">
            <Input
              id="resend-api-key"
              size="small"
              value={values.apiKey}
              error={fieldErrors.apiKey}
              disabled={disabled || sendingTestEmail}
              autoComplete="off"
              aria-label="Resend API key"
              onChange={(value) => setValue('apiKey', value)}
            />
          </div>
        </div>
        <div className="resend-config__field">
          <div className="resend-config__field-details">
            <label
              className="resend-config__label text-b-m text-bold"
              htmlFor="resend-email-address"
            >
              Sender address
            </label>
            <span className="text-b-s text-light">Emails will be sent from this address.</span>
          </div>
          <div className="resend-config__control">
            <Input
              id="resend-email-address"
              size="small"
              value={values.email}
              error={fieldErrors.email}
              disabled={disabled || sendingTestEmail}
              autoComplete="email"
              inputMode="email"
              aria-label="Resend email address"
              onChange={(value) => setValue('email', value)}
            />
          </div>
        </div>
      </div>
      {configurationError ? (
        <InfoText size="small" variant="error" className="resend-config__error">
          {configurationError}
        </InfoText>
      ) : null}
      <Button
        type="secondary"
        size="medium"
        className="resend-config__test-button"
        text={accountEmail ? `Send email to ${accountEmail}` : 'Send test email'}
        disabled={disabled || sendingTestEmail}
        onClick={openTestEmailModal}
      />
    </div>
  );
});
