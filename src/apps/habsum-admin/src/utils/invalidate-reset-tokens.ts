import type { Database } from 'bun:sqlite';

export default function invalidateResetTokens(
  database: Database,
  username: string,
  usedAt: number,
): void {
  database
    .query<never, [number, string]>(
      `
      UPDATE password_reset_tokens
      SET used_at = ?
      WHERE user_id = ? AND used_at IS NULL AND purpose = 'reset'
    `,
    )
    .run(usedAt, username);
}
