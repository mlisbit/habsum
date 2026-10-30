import { hashPassword } from '@habsum/utils/password';
import isForbiddenUsername from '@habsum/utils/is-forbidden-username';
import YAMLConfig from '../../../server/src/utils/yaml-config/yaml-config.ts';
import getHabsumDatabase from '../utils/get-habsum-database.ts';
import getInput from '../utils/get-input.ts';
import getHiddenInput from '../utils/get-hidden-input.ts';

type AddAdminOptions = {
  databasePath?: string;
  readUsername?: (question: string) => Promise<string>;
  readPassword?: (question: string) => Promise<string>;
  writeLine?: (line: string) => void;
};

export default async function addAdmin(
  username?: string,
  {
    databasePath = process.env.HABSUM_DB,
    readUsername = getInput,
    readPassword = getHiddenInput,
    writeLine = console.log,
  }: AddAdminOptions = {},
): Promise<void> {
  const normalizedUsername = (username ?? (await readUsername('Username: '))).trim();
  if (
    !normalizedUsername ||
    normalizedUsername.length > 200 ||
    /[/\\]/.test(normalizedUsername) ||
    isForbiddenUsername(normalizedUsername)
  ) {
    throw new Error('invalid username.');
  }

  const database = getHabsumDatabase(databasePath, 'read-write');
  try {
    const existingUser = database
      .query<{ username: string }, [string]>('SELECT username FROM users WHERE username = ?')
      .get(normalizedUsername);
    const existingConfig = database
      .query<{ user: string }, [string]>('SELECT user FROM habit_configs WHERE user = ? LIMIT 1')
      .get(normalizedUsername);
    if (existingUser || existingConfig) {
      throw new Error(`user account or habit config already exists: ${normalizedUsername}`);
    }

    const password = (await readPassword('Password for new administrator: ')).trim();
    if (!password) throw new Error('password is required.');
    const passwordHash = hashPassword(password);

    database.transaction(() => {
      database
        .query<never, [string, string, string]>(
          `
        INSERT INTO users (username, pin, admin, display_name, theme, email, created_at, active_habit_config_version)
        VALUES (?, ?, 1, NULL, 'dark', NULL, ?, 1)
      `,
        )
        .run(normalizedUsername, passwordHash, new Date().toISOString());
      database
        .query<
          never,
          [string, string]
        >('INSERT INTO habit_configs (user, version, text) VALUES (?, 1, ?)')
        .run(
          normalizedUsername,
          new YAMLConfig().getSerializer().serialize({
            includeAbsentDaysInAverage: false,
            habits: [],
          }),
        );
    })();
    writeLine(`Administrator account created for ${normalizedUsername}.`);
  } finally {
    database.close();
  }
}
