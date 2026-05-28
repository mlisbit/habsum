import { createHash, randomBytes } from 'node:crypto';
import {
  INVITE_TOKEN_TTL_SECONDS,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
  type PasswordResetTokenPurpose,
} from './constants.js';
import {
  findValidPasswordResetToken,
  insertPasswordResetToken,
  invalidateActivePasswordResetTokens,
  markPasswordResetTokenUsed,
} from './db.js';

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export function generatePasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url');
}

function tokenTtlSeconds(purpose: PasswordResetTokenPurpose): number {
  return purpose === 'invite' ? INVITE_TOKEN_TTL_SECONDS : PASSWORD_RESET_TOKEN_TTL_SECONDS;
}

export function issuePasswordResetToken(
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

export function lookupValidPasswordResetToken(
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

export function consumePasswordResetToken(
  id: number,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  return markPasswordResetTokenUsed(id, nowSec);
}
