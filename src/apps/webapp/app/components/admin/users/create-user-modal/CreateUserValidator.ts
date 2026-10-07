import type {
  CreateUserFieldErrors,
  CreateUserRequest,
  CreateUserValidationResult,
} from '@habsum/types/common/misc';
import { ApiRequestError, getUsernameAvailability } from '~/api.client';

export type CreateUserFormValues = {
  email: string;
  username: string;
  displayName: string;
};

export type { CreateUserFieldErrors, CreateUserValidationResult };

type UsernameAvailabilityChecker = typeof getUsernameAvailability;

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasOnlyUsernameCharacters(value: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(value);
}

function getValidationResult(cause: unknown): CreateUserValidationResult | null {
  if (!(cause instanceof ApiRequestError)) return null;
  const body = cause.body;
  if (typeof body !== 'object' || body === null) return null;
  if (!('request' in body) || typeof body.request !== 'object' || body.request === null)
    return null;
  if (!('errors' in body) || typeof body.errors !== 'object' || body.errors === null) return null;

  const errors = body.errors as Record<string, unknown>;
  const validFields = new Set(['email', 'username', 'displayName']);
  if (
    Object.entries(errors).some(
      ([field, message]) => !validFields.has(field) || typeof message !== 'string',
    )
  ) {
    return null;
  }

  return body as CreateUserValidationResult;
}

export default class CreateUserValidator {
  constructor(
    private readonly checkUsernameAvailability: UsernameAvailabilityChecker = getUsernameAvailability,
  ) {}

  async validate(values: CreateUserFormValues): Promise<CreateUserValidationResult> {
    const request = this.getRequest(values);
    const errors: CreateUserFieldErrors = {};

    if (!request.email && !request.username) {
      errors.email = 'Enter an email or username.';
    } else if (request.email && !isPlausibleEmail(request.email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (request.username && !hasOnlyUsernameCharacters(request.username)) {
      errors.username = 'Username can only contain letters and numbers.';
    } else if (request.username) {
      try {
        const availability = await this.checkUsernameAvailability(request.username);
        if (!availability.available) errors.username = 'Username is already in use.';
      } catch (cause) {
        const serverValidation = getValidationResult(cause);
        errors.username =
          serverValidation?.errors.username ?? 'Could not validate username. Try again.';
      }
    }

    return { request, errors };
  }

  getServerErrorResult(values: CreateUserFormValues, cause: unknown): CreateUserValidationResult {
    const serverValidation = getValidationResult(cause);
    if (serverValidation) return serverValidation;

    const request = this.getRequest(values);
    const errors: CreateUserFieldErrors = {};
    const message = cause instanceof TypeError ? cause.message : 'Failed to create user.';
    if (request.username) errors.username = message;
    else errors.email = message;

    return { request, errors };
  }

  private getRequest(values: CreateUserFormValues): CreateUserRequest {
    const email = values.email.trim().toLowerCase();
    const username = values.username.trim();
    const displayName = values.displayName.trim();

    return {
      ...(email ? { email } : {}),
      ...(username ? { username } : {}),
      ...(displayName ? { displayName } : {}),
    };
  }
}
