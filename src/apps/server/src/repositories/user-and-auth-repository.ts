// Repository for user, profile, session, and auth persistence operations.
import {
  createUserSession,
  deleteUserPin,
  ensureUserPins,
  getUserProfile,
  getUsernameForSession,
  isEmailUsedByOtherUser,
  isOucSessionId,
  isUserAdmin,
  isUserPinValid,
  listSessionsForUsername,
  passwordResetRetryAfterSeconds,
  patchUserProfile,
  purgeUserData,
  recordPasswordResetRequest,
  recordUserLoginMetadata,
  renameUserPin,
  resolveUsernameByLoginId,
  revokeOtherUserSessions,
  revokeUserSession,
  revokeUserSessionByTokenPrefix,
  setUserPin,
  updateLoginPin,
} from '../db.js';
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
  lookupValidPasswordResetToken,
} from '../password-reset-token.js';
import { isNewLoginPasswordAllowed, resetLoginPassword } from '../reset-login-password.js';
import { sessionTtlSeconds } from '../session-cookie.js';

export class UserAndAuthRepository {
  resolveUsernameByLoginId(loginId: string): string | null {
    return resolveUsernameByLoginId(loginId);
  }

  ensureUserPins(usernames: string[]): void {
    ensureUserPins(usernames);
  }

  isUserPinValid(username: string, pin: string): boolean {
    return isUserPinValid(username, pin);
  }

  isNewLoginPasswordAllowed(userId: string, newPin: string): boolean {
    return isNewLoginPasswordAllowed(userId, newPin);
  }

  setUserPin(username: string, pin: string): void {
    setUserPin(username, pin);
  }

  updateLoginPin(username: string, pin: string): boolean {
    return updateLoginPin(username, pin);
  }

  resetLoginPassword(userId: string, newPin: string): void {
    resetLoginPassword(userId, newPin);
  }

  renameUserPin(fromUsername: string, toUsername: string): void {
    renameUserPin(fromUsername, toUsername);
  }

  deleteUserPin(username: string): void {
    deleteUserPin(username);
  }

  createUserSession(username: string): string {
    return createUserSession(username, sessionTtlSeconds());
  }

  getUsernameForSession(sessionId: string): string | null {
    return getUsernameForSession(sessionId);
  }

  revokeUserSession(sessionId: string): void {
    revokeUserSession(sessionId);
  }

  isOucSessionId(sessionId: string): boolean {
    return isOucSessionId(sessionId);
  }

  listSessionsForUsername(username: string) {
    return listSessionsForUsername(username);
  }

  revokeOtherUserSessions(username: string, exceptSessionId: string): number {
    return revokeOtherUserSessions(username, exceptSessionId);
  }

  revokeUserSessionByTokenPrefix(
    username: string,
    tokenPrefix: string,
    currentSessionId: string | undefined,
  ) {
    return revokeUserSessionByTokenPrefix(username, tokenPrefix, currentSessionId);
  }

  getUserProfile(username: string) {
    return getUserProfile(username);
  }

  patchUserProfile(
    username: string,
    patch: { displayName?: string | null; theme?: string | null; email?: string },
  ): void {
    patchUserProfile(username, patch);
  }

  isEmailUsedByOtherUser(email: string, exceptUsername: string): boolean {
    return isEmailUsedByOtherUser(email, exceptUsername);
  }

  isUserAdmin(username: string): boolean {
    return isUserAdmin(username);
  }

  purgeUserData(user: string): void {
    purgeUserData(user);
  }

  recordUserLoginMetadata(username: string, webAndApiVersion: string): void {
    recordUserLoginMetadata(username, webAndApiVersion);
  }

  passwordResetRetryAfterSeconds(username: string): number {
    return passwordResetRetryAfterSeconds(username);
  }

  recordPasswordResetRequest(username: string): void {
    recordPasswordResetRequest(username);
  }

  issuePasswordResetToken(userId: string, purpose: 'reset' | 'invite') {
    return issuePasswordResetToken(userId, purpose);
  }

  lookupValidPasswordResetToken(token: string) {
    return lookupValidPasswordResetToken(token);
  }

  consumePasswordResetToken(id: number): boolean {
    return consumePasswordResetToken(id);
  }
}
