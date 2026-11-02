import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const execFileAsync = promisify(execFile);

test('opens first administrator signup on an initial visit with an empty database', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveURL('/welcome');
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  await expect(
    page.getByText('Create the first administrator account.', { exact: true }),
  ).toBeVisible();

  const username = page.getByPlaceholder('Username', { exact: true });
  const password = page.getByPlaceholder('Password', { exact: true });
  const createAccount = page.getByRole('button', { name: 'Create account', exact: true });

  await expect(username).toBeVisible();
  await expect(password).toBeVisible();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveAttribute('autocomplete', 'new-password');
  await expect(createAccount).toBeVisible();
  await expect(createAccount).toBeDisabled();

  await username.fill('first-owner');
  await password.fill('e2e-password');
  await expect(createAccount).toBeEnabled();
  await createAccount.click();

  await expect(page).toHaveURL('/users/first-owner/habits');
  await expect(
    page.getByRole('heading', { name: 'Let’s build your first habit.', exact: true }),
  ).toBeVisible();

  const meResponse = await page.request.get('/api/users/me');
  expect(meResponse.status()).toBe(200);
  expect(await meResponse.json()).toMatchObject({
    username: 'first-owner',
    admin: true,
    entitlements: expect.arrayContaining(['ADMIN']),
  });

  const adminSettingsResponse = await page.request.get('/api/administrator/application-settings');
  expect(adminSettingsResponse.status()).toBe(200);

  const applicationResponse = await page.request.get('/api/application');
  expect(applicationResponse.status()).toBe(200);
  const { database } = await applicationResponse.json();
  expect(database.path).toEqual(expect.any(String));

  const { stdout, stderr } = await execFileAsync(
    path.resolve(__dirname, '../node_modules/.bin/habsum-admin'),
    ['list-users'],
    {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, HABSUM_DB: database.path },
      timeout: 10_000,
    },
  );
  expect(stderr).toBe('');
  expect(stdout).toMatch(/^first-owner\s+NEW_USER, ADMIN\s*$/m);
});
