// Repository for user, profile, session, and auth persistence operations.
import {
  generatePasswordResetToken,
  getPasswordResetTokenHash,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
} from '@habsum/utils/password';
import {
  countAdmins,
  createFirstAdminUser,
  createInitialAdminUser,
  countUserEvents,
  createUserSession,
  createOucUserSession,
  deleteUserAuthRecord,
  findValidPasswordResetToken,
  getFirstDate,
  getUserProfile,
  getUsernameForSession,
  hasUsers,
  insertPasswordResetToken,
  invalidateActivePasswordResetTokens,
  isEmailUsedByOtherUser,
  isOucSessionId,
  isUserAdmin,
  isUserBetaTester,
  isDemoUser,
  isUserPasswordValid,
  listUserRows,
  listSessionsForUsername,
  markPasswordResetTokenUsed,
  passwordResetRetryAfterSeconds,
  patchUserProfile,
  purgeUserData,
  recordPasswordResetRequest,
  recordUserLoginMetadata,
  renameUserAuthRecord,
  resolveUsernameByLoginId,
  revokeOtherUserSessions,
  revokeUserSession,
  revokeUserSessionByTokenPrefix,
  setUserPassword,
  setUserDemo,
  updateLoginPassword,
} from './_private/db.js';
import { INVITE_TOKEN_TTL_SECONDS, type PasswordResetTokenPurpose } from '../constants.js';
import { sessionTtlSeconds } from '../utils/cookie-session-utils.js';

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

  createInitialAdminUser(username: string, password: string): void {
    createInitialAdminUser(username, password);
  }

  createFirstAdminUser(username: string, password: string): boolean {
    return createFirstAdminUser(username, password);
  }

  isUserPasswordValid(username: string, password: string): boolean {
    return isUserPasswordValid(username, password);
  }

  isNewLoginPasswordAllowed(userId: string, newPassword: string): boolean {
    return !isUserPasswordValid(userId, newPassword);
  }

  setUserPassword(username: string, password: string): void {
    setUserPassword(username, password);
  }

  updateLoginPassword(username: string, password: string): boolean {
    return updateLoginPassword(username, password);
  }

  resetLoginPassword(userId: string, newPassword: string): boolean {
    return updateLoginPassword(userId, newPassword);
  }

  renameUserAuthRecord(fromUsername: string, toUsername: string): void {
    renameUserAuthRecord(fromUsername, toUsername);
  }

  deleteUserAuthRecord(username: string): void {
    deleteUserAuthRecord(username);
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

  hasUsers(): boolean {
    return hasUsers();
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

  isDemoUser(username: string): boolean {
    return isDemoUser(username);
  }

  setUserDemo(username: string, demoUser: boolean): boolean {
    return setUserDemo(username, demoUser);
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
    const tokenHash = getPasswordResetTokenHash(token);
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
    const row = findValidPasswordResetToken(getPasswordResetTokenHash(trimmed), nowSec);
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
