import type { AdministratorEmailTestRequest } from '@habsum/types/api-responses/administrator-email-settings';

export type EmailConfigurationFormValues = {
  apiKey: string;
  email: string;
};

export type EmailConfigurationFieldErrors = Partial<
  Record<keyof EmailConfigurationFormValues, string>
>;

export type EmailConfigurationValidationResult = {
  request: AdministratorEmailTestRequest['emailProvider'];
  errors: EmailConfigurationFieldErrors;
};

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default class EmailConfigurationValidator {
  validate(values: EmailConfigurationFormValues): EmailConfigurationValidationResult {
    const request = this.getRequest(values);
    const errors: EmailConfigurationFieldErrors = {};

    if (!request.apiKey) errors.apiKey = 'Resend API key is required.';

    if (!request.email) {
      errors.email = 'Email address is required.';
    } else if (!isPlausibleEmail(request.email)) {
      errors.email = 'Enter a valid email address.';
    }

    return { request, errors };
  }

  getServerErrorResult(
    values: EmailConfigurationFormValues,
    cause: unknown,
  ): EmailConfigurationValidationResult {
    const request = this.getRequest(values);
    const errors: EmailConfigurationFieldErrors = {};
    if (!(cause instanceof Error)) return { request, errors };

    const message = cause.message;
    const normalizedMessage = message.toLowerCase();
    if (normalizedMessage.includes('api key') || normalizedMessage.includes('apikey')) {
      errors.apiKey = message;
    } else if (
      normalizedMessage.includes('email address') ||
      normalizedMessage.includes('from email') ||
      normalizedMessage === 'email must be a string'
    ) {
      errors.email = message;
    }

    return { request, errors };
  }

  private getRequest(
    values: EmailConfigurationFormValues,
  ): AdministratorEmailTestRequest['emailProvider'] {
    return {
      name: 'resend',
      apiKey: values.apiKey.trim(),
      email: values.email.trim(),
    };
  }
}
