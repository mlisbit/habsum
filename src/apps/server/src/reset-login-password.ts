import { isUserPinValid, setUserPin, updateLoginPin } from './db.js';

/** Updates login password for a forgot-password reset flow. */
export function resetLoginPassword(userId: string, newPin: string): void {
  const updated = updateLoginPin(userId, newPin);
  if (!updated) {
    setUserPin(userId, newPin);
  }
}

export function isNewLoginPasswordAllowed(userId: string, newPin: string): boolean {
  return !isUserPinValid(userId, newPin);
}
