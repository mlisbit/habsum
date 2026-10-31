import type SessionContext from './utils/classes/session-context.js';

declare global {
  namespace Express {
    interface Locals {
      session: SessionContext | null;
    }
  }
}
