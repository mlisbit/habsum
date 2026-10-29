import { describe, expect, it } from 'vitest';
import { validateAccountSave } from './account';

describe('validateAccountSave', () => {
  it.each([undefined, '', '   '])('allows saving an account with email %j', (email) => {
    expect(validateAccountSave({ username: 'alex', email })).toEqual({});
  });

  it('still validates an email when provided', () => {
    expect(validateAccountSave({ username: 'alex', email: 'invalid' })).toEqual({
      email: ['Enter a valid email address.'],
    });
    expect(validateAccountSave({ username: 'alex', email: ' alex@example.com ' })).toEqual({});
  });
});
