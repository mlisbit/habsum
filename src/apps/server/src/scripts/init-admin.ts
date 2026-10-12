import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { generateTemporaryPassword } from '@habsum/utils/password';
import { ConfigService } from '../services/config-service.js';
import { DatabaseRepository } from '../repositories/database-repository.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import isForbiddenUsername from '@habsum/utils/is-forbidden-username';
import { isSafeConfigUserId } from '../utils/request-utils.js';

const configService = new ConfigService();
const databaseRepository = new DatabaseRepository();
const userAndAuthRepository = new UserAndAuthRepository();

async function promptUsername(): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    while (true) {
      const username = (await rl.question('Admin username: ')).trim();
      if (!username) {
        console.log('Username is required.');
        continue;
      }
      if (!isSafeConfigUserId(username)) {
        console.log('Invalid username (no slashes or path segments; max 200 characters).');
        continue;
      }
      if (isForbiddenUsername(username)) {
        console.log('That username is reserved.');
        continue;
      }
      return username;
    }
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  configService.ensureConfigLayout();

  if (userAndAuthRepository.hasUsers()) {
    console.log('A user account already exists. No changes made.');
    return;
  }

  console.log('No admin accounts found. Creating the initial admin user.\n');

  const username = await promptUsername();

  const configResult = configService.createEmptyUserConfig(username);
  if (!configResult.ok) {
    console.error(`Failed to create user config: ${configResult.error}`);
    process.exit(1);
  }

  const password = generateTemporaryPassword();
  const created = userAndAuthRepository.createFirstAdminUser(username, password);
  if (!created) {
    configService.deleteUserConfig(username);
    console.log('A user account already exists. No changes made.');
    return;
  }

  console.log('');
  console.log('Initial admin created.');
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log('');
  console.log('Save the password now — it cannot be retrieved later.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => {
    databaseRepository.close();
  });
