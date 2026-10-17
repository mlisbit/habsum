import ServiceError from './classes/service-error.js';
import isDemoEnabled from './is-demo-enabled.js';

/** Reject a service operation in demo mode, optionally only for matching arguments. */
export default function restrictForDemo<Args extends unknown[]>(when?: (...args: Args) => boolean) {
  return function <This, Result>(
    method: (this: This, ...args: Args) => Result,
    _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
  ) {
    return function (this: This, ...args: Args): Result {
      if (isDemoEnabled() && (when == null || when(...args))) {
        throw new ServiceError('forbidden', 'This action is unavailable in demo mode.');
      }
      return method.apply(this, args);
    };
  };
}
