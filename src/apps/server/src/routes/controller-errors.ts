import type { Response } from 'express';
import { ServiceError, type ServiceErrorKind } from '../service-error.js';

const STATUS_BY_KIND: Record<ServiceErrorKind, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unavailable: 503,
  internal: 500,
};

export function sendServiceError(error: unknown, res: Response): Response {
  if (!(error instanceof ServiceError)) throw error;
  return res.status(STATUS_BY_KIND[error.kind]).json({ error: error.message });
}

export function sendServiceResult<T>(
  res: Response,
  operation: () => T,
  successStatus = 200,
): Response {
  try {
    return res.status(successStatus).json(operation());
  } catch (error) {
    return sendServiceError(error, res);
  }
}

export async function sendAsyncServiceResult<T>(
  res: Response,
  operation: () => Promise<T>,
  successStatus = 200,
): Promise<Response> {
  try {
    return res.status(successStatus).json(await operation());
  } catch (error) {
    return sendServiceError(error, res);
  }
}
