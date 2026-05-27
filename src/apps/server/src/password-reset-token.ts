import { createHash, randomBytes } from 'node:crypto';
import { PASSWORD_RESET_TOKEN_BYTES, PASSWORD_RESET_TOKEN_TTL_SECONDS } from './constants.js';
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

export function issuePasswordResetToken(
  userId: string,
  nowSec = Math.floor(Date.now() / 1000),
): { token: string; expiresAt: number; id: number } {
  invalidateActivePasswordResetTokens(userId, nowSec);
  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = nowSec + PASSWORD_RESET_TOKEN_TTL_SECONDS;
  const id = insertPasswordResetToken({
    userId,
    tokenHash,
    expiresAt,
    createdAt: nowSec,
  });
  return { token, expiresAt, id };
}

export function lookupValidPasswordResetToken(
  token: string,
  nowSec = Math.floor(Date.now() / 1000),
): { id: number; userId: string } | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  return findValidPasswordResetToken(hashPasswordResetToken(trimmed), nowSec);
}

export function consumePasswordResetToken(
  id: number,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  return markPasswordResetTokenUsed(id, nowSec);
}
