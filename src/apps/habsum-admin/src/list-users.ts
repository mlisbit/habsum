import getHabsumDatabase from './get-habsum-database.ts';
import getUserAccounts from './get-user-accounts.ts';
import getUserAccountsOutput from './get-user-accounts-output.ts';

export default function listUsers(databasePath = process.env.HABSUM_DB): void {
  const database = getHabsumDatabase(databasePath);
  try {
    console.log(getUserAccountsOutput(getUserAccounts(database)));
  } finally {
    database.close();
  }
}
