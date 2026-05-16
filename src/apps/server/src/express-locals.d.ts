declare global {
  namespace Express {
    interface Locals {
      /** Set by auth middleware after a valid session cookie. */
      sessionUser?: string;
    }
  }
}

export {};
