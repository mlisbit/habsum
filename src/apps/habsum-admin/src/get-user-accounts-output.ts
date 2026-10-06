import type { UserAccount } from './get-user-accounts.ts';

const USERNAME_HEADING = 'USERNAME';
const ENTITLEMENTS_HEADING = 'ENTITLEMENTS';

export default function getUserAccountsOutput(accounts: UserAccount[]): string {
  if (accounts.length === 0) {
    return 'No user accounts found.';
  }

  const usernameWidth = Math.max(
    USERNAME_HEADING.length,
    ...accounts.map((account) => account.username.length),
  );
  const rows = accounts.map((account) => {
    const entitlements = account.entitlements.join(', ') || '(none)';
    return `${account.username.padEnd(usernameWidth)}  ${entitlements}`;
  });

  return [`${USERNAME_HEADING.padEnd(usernameWidth)}  ${ENTITLEMENTS_HEADING}`, ...rows].join('\n');
}
