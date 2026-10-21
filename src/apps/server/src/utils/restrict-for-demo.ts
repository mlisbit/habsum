import ServiceError from './classes/service-error.js';
import getDemoRestrictionContext from './get-demo-restriction-context.js';
import isDemoEnabled from './is-demo-enabled.js';

/** Restrict operations using the session or recovery account resolved by request middleware. */
export default function restrictForDemo() {
  return function <This, Args extends unknown[], Result>(
    method: (this: This, ...args: Args) => Result,
    _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
  ) {
    return function (this: This, ...args: Args): Result {
      const context = getDemoRestrictionContext().getStore();
      if (
        isDemoEnabled() &&
        !context?.user?.admin &&
        !context?.user?.isOucSession &&
        !context?.passwordRecovery?.account?.admin
      ) {
        throw new ServiceError('forbidden', 'Action prevented for demo users.');
      }
      return method.apply(this, args);
    };
  };
}
