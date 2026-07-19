// Repository for user, profile, session, and auth persistence operations.
import { createHash, randomBytes } from 'node:crypto';
import {
  countAdmins,
  createInitialAdminUser,
  countUserEvents,
  createUserSession,
  createOucUserSession,
  deleteUserPin,
  ensureUserPins,
  findValidPasswordResetToken,
  getFirstDate,
  getUserProfile,
  getUsernameForSession,
  insertPasswordResetToken,
  invalidateActivePasswordResetTokens,
  isEmailUsedByOtherUser,
  isOucSessionId,
  isUserAdmin,
  isUserBetaTester,
  isUserPinValid,
  listUserRows,
  listSessionsForUsername,
  markPasswordResetTokenUsed,
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
} from './_private/db.js';
import {
  INVITE_TOKEN_TTL_SECONDS,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
  type PasswordResetTokenPurpose,
} from '../constants.js';
import { sessionTtlSeconds } from '../utils/cookie-session-utils.js';

function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

function generatePasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url');
}

function tokenTtlSeconds(purpose: PasswordResetTokenPurpose): number {
  return purpose === 'invite' ? INVITE_TOKEN_TTL_SECONDS : PASSWORD_RESET_TOKEN_TTL_SECONDS;
}

export class UserAndAuthRepository {
  resolveUsernameByLoginId(loginId: string): string | null {
    return resolveUsernameByLoginId(loginId);
  }

  countAdmins(): number {
    return countAdmins();
  }

  createInitialAdminUser(username: string, pin: string): void {
    createInitialAdminUser(username, pin);
  }

  ensureUserPins(usernames: string[]): void {
    ensureUserPins(usernames);
  }

  isUserPinValid(username: string, pin: string): boolean {
    return isUserPinValid(username, pin);
  }

  isNewLoginPasswordAllowed(userId: string, newPin: string): boolean {
    return !isUserPinValid(userId, newPin);
  }

  setUserPin(username: string, pin: string): void {
    setUserPin(username, pin);
  }

  updateLoginPin(username: string, pin: string): boolean {
    return updateLoginPin(username, pin);
  }

  resetLoginPassword(userId: string, newPin: string): void {
    const updated = updateLoginPin(userId, newPin);
    if (!updated) {
      setUserPin(userId, newPin);
    }
  }

  renameUserPin(fromUsername: string, toUsername: string): void {
    renameUserPin(fromUsername, toUsername);
  }

  deleteUserPin(username: string): void {
    deleteUserPin(username);
  }

  createUserSession(username: string, ttlSeconds = sessionTtlSeconds()): string {
    return createUserSession(username, ttlSeconds);
  }

  createOucUserSession(username: string, ttlSeconds = sessionTtlSeconds()): string {
    return createOucUserSession(username, ttlSeconds);
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

  listUserRows() {
    return listUserRows();
  }

  countUserEvents(username: string): number {
    return countUserEvents(username);
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

  isUserBetaTester(username: string): boolean {
    return isUserBetaTester(username);
  }

  getFirstDate(username: string): string | null {
    return getFirstDate(username);
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

  issuePasswordResetToken(
    userId: string,
    purpose: PasswordResetTokenPurpose,
    nowSec = Math.floor(Date.now() / 1000),
  ): { token: string; expiresAt: number; id: number } {
    invalidateActivePasswordResetTokens(userId, purpose, nowSec);
    const token = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = nowSec + tokenTtlSeconds(purpose);
    const id = insertPasswordResetToken({
      userId,
      tokenHash,
      expiresAt,
      createdAt: nowSec,
      purpose,
    });
    return { token, expiresAt, id };
  }

  lookupValidPasswordResetToken(
    token: string,
    nowSec = Math.floor(Date.now() / 1000),
  ): { id: number; userId: string; purpose: PasswordResetTokenPurpose } | null {
    const trimmed = token.trim();
    if (!trimmed) return null;
    const row = findValidPasswordResetToken(hashPasswordResetToken(trimmed), nowSec);
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      purpose: row.purpose === 'invite' ? 'invite' : 'reset',
    };
  }

  consumePasswordResetToken(id: number, nowSec = Math.floor(Date.now() / 1000)): boolean {
    return markPasswordResetTokenUsed(id, nowSec);
  }
}
