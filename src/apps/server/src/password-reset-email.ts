/** Sends a password-reset email. No-op until outbound mail is configured. */
export async function sendPasswordResetEmail(username: string, email: string): Promise<void> {
  void username;
  void email;
}
