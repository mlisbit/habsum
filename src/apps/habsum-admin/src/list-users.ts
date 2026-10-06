import getHabsumDatabase from './get-habsum-database.ts';
import getUserAccounts from './get-user-accounts.ts';
import getUserAccountsOutput from './get-user-accounts-output.ts';

export default function listUsers(configDir = process.env.HABSUM_CONFIG_DIR): void {
  const database = getHabsumDatabase(configDir);
  try {
    console.log(getUserAccountsOutput(getUserAccounts(database)));
  } finally {
    database.close();
  }
}
