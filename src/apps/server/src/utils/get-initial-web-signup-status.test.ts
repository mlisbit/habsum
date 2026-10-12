import { describe, expect, it } from 'vitest';
import getInitialWebSignupStatus from './get-initial-web-signup-status.js';

describe('initial web signup startup status', () => {
  it.each([
    [false, 'true', true, 'ENABLED [empty db, env variable enabled]'],
    [true, 'true', false, 'DISABLED [non-empty db, env variable enabled]'],
    [false, 'false', false, 'DISABLED [empty db, env variable disabled]'],
    [true, 'false', false, 'DISABLED [non-empty db, env variable disabled]'],
    [false, '1', false, 'DISABLED [empty db, env variable disabled]'],
  ])('reports database and flag state (%s, %s)', (hasUsers, initialWebSignup, enabled, state) => {
    expect(getInitialWebSignupStatus(hasUsers, { initialWebSignup })).toEqual({
      enabled,
      message: `WEB SIGNUP FOR INITIAL USER ${state}`,
    });
  });
});
