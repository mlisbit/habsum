import { useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { ModalBody, ModalFooter, ModalHeader } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import { sendUserInviteEmail } from '~/api.client';
import type { CreatedUserCredentials } from './CreateUserModal';

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
        type="secondary"
        size="medium"
        text={emailSent ? `Email sent to ${email}` : `Send email to ${email}`}
        className="mr-2"
        disabled={sendingEmail || emailSent}
        onClick={() => void sendEmail()}
      />
    ) : undefined;

  return (
    <>
      <ModalHeader>Account created</ModalHeader>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">Share these login details with the user.</p>
        <dl className="developer-page__credentials">
          {email ? (
            <div className="developer-page__credentials-row">
              <dt className="developer-page__credentials-term text-b-m text-light">Email</dt>
              <dd className="developer-page__credentials-value text-b-m text-bold">{email}</dd>
            </div>
          ) : null}
          <div className="developer-page__credentials-row">
            <dt className="developer-page__credentials-term text-b-m text-light">Username</dt>
            <dd className="developer-page__credentials-value text-b-m text-bold">{user}</dd>
          </div>
          <div className="developer-page__credentials-row">
            <dt className="developer-page__credentials-term text-b-m text-light">
              Temporary password
            </dt>
            <dd className="developer-page__credentials-value text-b-m text-bold developer-page__credentials-password">
              {password}
            </dd>
          </div>
          <div className="developer-page__credentials-row">
            <dt className="developer-page__credentials-term text-b-m text-light">
              Registration URL
            </dt>
            <dd className="developer-page__credentials-value text-b-m developer-page__credentials-password">
              <a className="text-link" href={registrationUrl}>
                {registrationUrl}
              </a>
            </dd>
          </div>
        </dl>
        {emailError ? (
          <InfoText size="small" variant="error">
            {emailError}
          </InfoText>
        ) : null}
      </ModalBody>
      <ModalFooter>
        {sendEmailAction}
        <Button type="primary" size="medium" text="Done" onClick={onClose} />
      </ModalFooter>
    </>
  );
}
