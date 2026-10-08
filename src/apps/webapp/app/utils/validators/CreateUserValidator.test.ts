import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '~/api.client';
import CreateUserValidator from './CreateUserValidator';

const validator = new CreateUserValidator(async () => ({ available: true }));

describe('CreateUserValidator', () => {
  it('normalizes a request containing email, username, and display name', async () => {
    expect(
      await validator.validate({
        email: '  Person@Example.COM ',
        username: ' invitedperson ',
        displayName: ' Invited Person ',
      }),
    ).toEqual({
      request: {
        email: 'person@example.com',
        username: 'invitedperson',
        displayName: 'Invited Person',
      },
      errors: {},
    });
  });

  it('associates validation errors with their fields', async () => {
    expect(
      await validator.validate({ email: 'invalid', username: '', displayName: '' }),
    ).toMatchObject({ errors: { email: 'Enter a valid email address.' } });
    expect(await validator.validate({ email: '', username: '', displayName: '' })).toMatchObject({
      errors: { email: 'Enter an email or username.' },
    });
  });

  it('checks username availability asynchronously', async () => {
    const unavailableValidator = new CreateUserValidator(async () => ({ available: false }));

    expect(
      await unavailableValidator.validate({ email: '', username: 'existing', displayName: '' }),
    ).toEqual({
      request: { username: 'existing' },
      errors: { username: 'Username is already in use.' },
    });
  });

  it('rejects special characters without checking username availability', async () => {
    const checkUsernameAvailability = vi.fn(async () => ({ available: true }));
    const specialCharacterValidator = new CreateUserValidator(checkUsernameAvailability);

    expect(
      await specialCharacterValidator.validate({
        email: '',
        username: 'invited-user',
        displayName: '',
      }),
    ).toEqual({
      request: { username: 'invited-user' },
      errors: { username: 'Username can only contain letters and numbers.' },
    });
    expect(checkUsernameAvailability).not.toHaveBeenCalled();
  });

  it('maps server errors into the same standardized result', () => {
    const response = {
      request: { email: 'person@example.com', username: 'chosenname' },
      errors: { username: 'Username is already in use.' },
    };

    expect(
      validator.getServerErrorResult(
        { email: 'person@example.com', username: 'chosenname', displayName: '' },
        new ApiRequestError(409, 'Conflict', response),
      ),
    ).toEqual(response);
  });
});
