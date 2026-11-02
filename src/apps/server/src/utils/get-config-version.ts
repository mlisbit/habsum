import ServiceError from './classes/service-error.js';

export default function getConfigVersion(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw new ServiceError('bad_request', 'v must be a positive integer');
  }
  return Number(value);
}
