#!/usr/bin/env bun

import addAdmin from './commands/add-admin.ts';
import listUsers from './commands/list-users.ts';
import resetPassword from './commands/reset-password.ts';

const usage = `Usage:
  habsum-admin add-admin [username]
  habsum-admin list-users
  habsum-admin reset-password [username]

Environment:
  HABSUM_DB     Path to the habsum.db file
  HABSUM_WEBAPP_URL   Base URL used for generated password-reset links`;

async function run(): Promise<void> {
  const [command, ...extraArguments] = Bun.argv.slice(2);

  if (command === '--help' || command === '-h') {
    console.log(usage);
    return;
  }

  if (command === 'list-users') {
    if (extraArguments.length > 0) {
      console.error(`list-users does not accept arguments.\n\n${usage}`);
      process.exitCode = 1;
      return;
    }

    listUsers();
    return;
  }

  if (command === 'add-admin') {
    if (extraArguments.length > 1) {
      console.error(`add-admin accepts at most one username.\n\n${usage}`);
      process.exitCode = 1;
      return;
    }
    await addAdmin(extraArguments[0]);
    return;
  }

  if (command === 'reset-password') {
    if (extraArguments.length > 1) {
      console.error(`reset-password accepts at most one username.\n\n${usage}`);
      process.exitCode = 1;
      return;
    }

    await resetPassword(extraArguments[0]);
    return;
  }

  if (command) {
    console.error(`Unknown command: ${command}\n`);
  }
  console.error(usage);
  process.exitCode = 1;
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`habsum-admin: ${message}`);
  process.exitCode = 1;
}
