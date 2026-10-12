import {
  generatePasswordResetToken,
  getPasswordResetTokenHash,
  getPasswordResetUrl,
  hashPassword,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
  verifyPassword,
} from '@habsum/utils/password';
import invalidateResetTokens from '../utils/invalidate-reset-tokens.ts';
import getHabsumDatabase from '../utils/get-habsum-database.ts';
import getInput from '../utils/get-input.ts';
import getHiddenInput from '../utils/get-hidden-input.ts';

type UserPasswordRow = {
  passwordHash: string;
};

type ResetPasswordOptions = {
  databasePath?: string;
  webappUrl?: string;
  readUsername?: (question: string) => Promise<string>;
  readPassword?: (question: string) => Promise<string>;
  getToken?: () => string;
  getNowSeconds?: () => number;
  writeLine?: (line: string) => void;
};

export default async function resetPassword(
  username?: string,
  options: ResetPasswordOptions = {},
): Promise<void> {
  const normalizedUsername = (
    username ?? (await (options.readUsername ?? getInput)('Username: '))
  ).trim();
  if (!normalizedUsername) {
    throw new Error('username is required.');
  }

  const database = getHabsumDatabase(options.databasePath, 'read-write');
  try {
    const user = database
      .query<UserPasswordRow, [string]>('SELECT pin AS passwordHash FROM users WHERE username = ?')
      .get(normalizedUsername);
    if (!user) {
      throw new Error(`user account not found: ${normalizedUsername}`);
    }

    const readPassword = options.readPassword ?? getHiddenInput;
    const password = (
      await readPassword('New password (leave blank to generate a reset link): ')
    ).trim();
    const nowSeconds = (options.getNowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
    const writeLine = options.writeLine ?? console.log;

    if (password) {
      if (verifyPassword(password, user.passwordHash)) {
        throw new Error('new password must be different from the current one.');
      }

      const updatePassword = database.query<never, [string, string]>(
        'UPDATE users SET pin = ? WHERE username = ?',
      );
      const passwordHash = hashPassword(password);
      database.transaction(() => {
        const result = updatePassword.run(passwordHash, normalizedUsername);
        if (result.changes !== 1) {
          throw new Error(`user account not found: ${normalizedUsername}`);
        }
        invalidateResetTokens(database, normalizedUsername, nowSeconds);
      })();

      writeLine(`Password updated for ${normalizedUsername}.`);
      return;
    }

    const token = (options.getToken ?? generatePasswordResetToken)();
    const tokenHash = getPasswordResetTokenHash(token);
    const expiresAt = nowSeconds + PASSWORD_RESET_TOKEN_TTL_SECONDS;
    const insertToken = database.query<never, [string, string, number, number]>(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at, purpose)
      VALUES (?, ?, ?, ?, 'reset')
    `);

    database.transaction(() => {
      invalidateResetTokens(database, normalizedUsername, nowSeconds);
      insertToken.run(normalizedUsername, tokenHash, expiresAt, nowSeconds);
    })();

    const resetUrl = getPasswordResetUrl(token, options.webappUrl ?? process.env.HABSUM_WEBAPP_URL);
    const expiryMinutes = Math.round(PASSWORD_RESET_TOKEN_TTL_SECONDS / 60);
    writeLine(
      `Password reset link for ${normalizedUsername} (expires in ${expiryMinutes} minutes):`,
    );
    writeLine(resetUrl);
  } finally {
    database.close();
  }
}
