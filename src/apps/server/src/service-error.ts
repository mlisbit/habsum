export type ServiceErrorKind =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'unavailable'
  | 'internal';

export class ServiceError extends Error {
  constructor(
    readonly kind: ServiceErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
