import { describe, expect, it } from 'vitest';
import EmailConfigurationValidator from './email-configuration-validator';

const validator = new EmailConfigurationValidator();

describe('EmailConfigurationValidator', () => {
  it('normalizes a valid Resend configuration', () => {
    expect(
      validator.validate({
        apiKey: '  re_secret  ',
        email: '  sender@example.com  ',
      }),
    ).toEqual({
      request: {
        name: 'resend',
        apiKey: 're_secret',
        email: 'sender@example.com',
      },
      errors: {},
    });
  });

  it('associates required errors with both configuration fields', () => {
    expect(validator.validate({ apiKey: '', email: '' }).errors).toEqual({
      apiKey: 'Resend API key is required.',
      email: 'Email address is required.',
    });
  });

  it('rejects an invalid sender email', () => {
    expect(validator.validate({ apiKey: 're_secret', email: 'invalid' }).errors).toEqual({
      email: 'Enter a valid email address.',
    });
  });

  it('maps known server errors to their configuration fields', () => {
    const values = { apiKey: 're_secret', email: 'sender@example.com' };

    expect(
      validator.getServerErrorResult(values, new Error('Resend API key is invalid')).errors,
    ).toEqual({ apiKey: 'Resend API key is invalid' });
    expect(
      validator.getServerErrorResult(values, new Error('invalid email address')).errors,
    ).toEqual({ email: 'invalid email address' });
    expect(
      validator.getServerErrorResult(values, new Error('Resend is unavailable')).errors,
    ).toEqual({});
  });
});
