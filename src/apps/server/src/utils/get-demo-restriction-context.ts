import { AsyncLocalStorage } from 'node:async_hooks';
import type { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';

type UserIdentity = { username: string; admin: boolean };
type PasswordResetToken = ReturnType<UserAndAuthRepository['lookupValidPasswordResetToken']>;

export type DemoRestrictionContext = {
  user: (UserIdentity & { isOucSession: boolean }) | null;
  passwordRecovery?:
    | { kind: 'forgot'; email: string; account: UserIdentity | null }
    | {
        kind: 'reset';
        token: string;
        resetToken: PasswordResetToken;
        account: UserIdentity | null;
      };
};

const demoRestrictionContext = new AsyncLocalStorage<DemoRestrictionContext>();

export default function getDemoRestrictionContext(): AsyncLocalStorage<DemoRestrictionContext> {
  return demoRestrictionContext;
}
