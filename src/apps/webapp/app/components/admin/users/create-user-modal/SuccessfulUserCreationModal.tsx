import { useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { useToast } from '@habsum/ui/contexts/toast';
import { sendUserInviteEmail } from '~/api.client';
import type { CreatedUserCredentials } from './CreateUserModal';
import UserCredentialsModal from './UserCredentialsModal';

type SuccessfulUserCreationModalProps = CreatedUserCredentials & {
  canSendEmail: boolean;
  onClose: () => void;
};

export default function SuccessfulUserCreationModal({
  user,
  password,
  email,
  registrationUrl,
  canSendEmail,
  onClose,
}: SuccessfulUserCreationModalProps) {
  const { showToast } = useToast();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const sendEmail = async () => {
    if (!email || sendingEmail) return;
    setEmailError(null);
    setSendingEmail(true);
    try {
      await sendUserInviteEmail(user, registrationUrl);
      setEmailSent(true);
      showToast({ type: 'success', message: `Invite sent to ${email}.` });
    } catch (cause) {
      setEmailError(cause instanceof Error ? cause.message : 'Failed to send invite email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const sendEmailAction =
    canSendEmail && email ? (
      <Button
        type="primary"
        size="medium"
        text={emailSent ? `Email sent to ${email}` : `Send email to ${email}`}
        disabled={sendingEmail || emailSent}
        onClick={() => void sendEmail()}
      />
    ) : undefined;

  return (
    <UserCredentialsModal
      title="Account created"
      description="Share these login details with the user."
      user={user}
      password={password}
      email={email}
      registrationUrl={registrationUrl}
      error={emailError}
      footerAction={sendEmailAction}
      onClose={onClose}
    />
  );
}
