import type { ReactNode } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { ModalBody, ModalFooter, ModalHeader } from '@habsum/ui/contexts/modal';

type UserCredentialsModalProps = {
  title: string;
  description: string;
  user: string;
  password: string;
  email?: string;
  registrationUrl?: string;
  error?: string | null;
  footerAction?: ReactNode;
  onClose: () => void;
};

export default function UserCredentialsModal({
  title,
  description,
  user,
  password,
  email,
  registrationUrl,
  error,
  footerAction,
  onClose,
}: UserCredentialsModalProps) {
  return (
    <>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody className="developer-page__add-user-modal">
        <p className="text-light text-b-m">{description}</p>
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
          {registrationUrl ? (
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
          ) : null}
        </dl>
        {error ? (
          <InfoText size="small" variant="error">
            {error}
          </InfoText>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          type={footerAction ? 'secondary' : 'primary'}
          size="medium"
          text="Done"
          className={footerAction ? 'mr-2' : undefined}
          onClick={onClose}
        />
        {footerAction}
      </ModalFooter>
    </>
  );
}
