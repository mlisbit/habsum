import { useState } from 'react';
import { Button } from '@habsum/ui/components/Button';
import { Input } from '@habsum/ui/components/Input';
import { ModalBody, ModalFooter, ModalHeader } from '@habsum/ui/contexts/modal';
import { createUser } from '~/api.client';
import CreateUserValidator, {
  type CreateUserFieldErrors,
  type CreateUserFormValues,
} from './CreateUserValidator';

export type CreatedUserCredentials = {
  user: string;
  password: string;
  email?: string;
  registrationUrl: string;
};

type CreateUserModalProps = {
  onCreated: (credentials: CreatedUserCredentials) => void;
  onClose: () => void;
};

const validator = new CreateUserValidator();

export default function CreateUserModal({ onCreated, onClose }: CreateUserModalProps) {
  const [values, setValues] = useState<CreateUserFormValues>({
    email: '',
    username: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<CreateUserFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = (field: keyof CreateUserFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const validation = await validator.validate(values);
      setErrors(validation.errors);
      if (Object.keys(validation.errors).length > 0) return;

      const response = await createUser(validation.request);
      onCreated({
        user: response.user,
        password: response.password,
        email: response.email,
        registrationUrl: response.registrationUrl,
      });
    } catch (cause) {
      setErrors(validator.getServerErrorResult(values, cause).errors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasIdentifier = Boolean(values.email.trim() || values.username.trim());
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <ModalHeader>Create user</ModalHeader>
      <ModalBody className="developer-page__add-user-modal">
        <div className="developer-page__add-user-field">
          <label htmlFor="create-user-email" className="text-b-m">
            Email
          </label>
          <Input
            id="create-user-email"
            error={errors.email}
            size="small"
            className="developer-page__add-user-input"
            value={values.email}
            disabled={isSubmitting}
            dismissable
            submittable={false}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            onChange={(value) => setValue('email', value)}
          />
        </div>
        <div className="developer-page__add-user-field">
          <label htmlFor="create-user-username" className="text-b-m">
            Username
          </label>
          <Input
            id="create-user-username"
            error={errors.username}
            size="small"
            className="developer-page__add-user-input"
            value={values.username}
            disabled={isSubmitting}
            dismissable
            submittable={false}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            onChange={(value) => setValue('username', value)}
          />
        </div>
        <div className="developer-page__add-user-field">
          <label htmlFor="create-user-display-name" className="text-b-m">
            Display name
          </label>
          <Input
            id="create-user-display-name"
            error={errors.displayName}
            size="small"
            className="developer-page__add-user-input"
            value={values.displayName}
            disabled={isSubmitting}
            dismissable
            submittable={false}
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            onChange={(value) => setValue('displayName', value)}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          type="secondary"
          size="medium"
          text="Cancel"
          disabled={isSubmitting}
          className="mr-2"
          onClick={onClose}
        />
        <Button
          type="primary"
          size="medium"
          text={isSubmitting ? 'Creating…' : 'Create'}
          disabled={isSubmitting || !hasIdentifier || hasErrors}
          onClick={() => void submit()}
        />
      </ModalFooter>
    </>
  );
}
