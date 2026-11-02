import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

const execFileAsync = promisify(execFile);

test.describe.configure({ mode: 'serial' });
test.use({ timezoneId: 'UTC' });

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

test('creates a pushup summation habit, records a quick add, and exports the data', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-11-02T12:00:00Z'));
  await page.goto('/login');
  await page.getByPlaceholder('Username or email', { exact: true }).fill('first-owner');
  await page.getByPlaceholder('Password', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL('/users/first-owner/habits');

  await page.getByRole('link', { name: 'Add your first habit', exact: true }).click();
  await page.getByRole('button', { name: /^Count toward a goal/ }).click();

  const habitDialog = page.getByRole('dialog');
  await habitDialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Pushups');
  await habitDialog.getByRole('button', { name: 'Add quick add value', exact: true }).click();
  await habitDialog.getByPlaceholder('Amount', { exact: true }).fill('5');
  await habitDialog.getByRole('button', { name: 'Add quick add value', exact: true }).click();
  await habitDialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(habitDialog).toBeHidden();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to dashboard', exact: true }).click();
  await expect(page).toHaveURL('/users/first-owner/habits');

  const quickAdd = page.getByRole('button', { name: 'Add 5 to Pushups', exact: true });
  await expect(quickAdd).toHaveText('+5');
  const recordPushups = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      new URL(response.url()).pathname === '/api/users/first-owner/habits',
  );
  await quickAdd.click();
  expect((await recordPushups).status()).toBe(200);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL('/users/first-owner/settings/account');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('first-owner-habsum-data.csv');
  const downloadPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(downloadPath);

  const rows = (await readFile(downloadPath, 'utf8'))
    .trimEnd()
    .split(/\r?\n/)
    .map((row) => row.split(','));
  expect(rows).toEqual([
    ['record_type', 'habit', 'date', 'value', 'event_id', 'amount', 'created_at'],
    [
      'summation_event',
      'Pushups',
      '2026-11-02',
      '',
      expect.stringMatching(/^[1-9]\d*$/),
      '5',
      '2026-11-02 12:00:00',
    ],
  ]);
});

test('saving a habit rename migrates its recorded data and updates the YAML config', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-11-02T12:00:00Z'));
  await page.goto('/login');
  await page.getByPlaceholder('Username or email', { exact: true }).fill('first-owner');
  await page.getByPlaceholder('Password', { exact: true }).fill('e2e-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL('/users/first-owner/habits');

  const originalConfigResponse = await page.request.get('/api/users/first-owner/config');
  expect(originalConfigResponse.status()).toBe(200);
  const originalConfig = await originalConfigResponse.json();
  expect(originalConfig.text).toMatch(/^  Pushups:/m);

  const originalDataResponse = await page.request.get('/api/users/first-owner/data');
  expect(originalDataResponse.status()).toBe(200);
  const originalCsv = await originalDataResponse.text();
  expect(originalCsv.trimEnd().split(/\r?\n/)).toEqual([
    'record_type,habit,date,value,event_id,amount,created_at',
    expect.stringMatching(/^summation_event,Pushups,2026-11-02,,[1-9]\d*,5,2026-11-02 12:00:00$/),
  ]);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  await page.getByRole('button', { name: 'View details for Pushups', exact: true }).click();
  const habitDialog = page.getByRole('dialog');
  await habitDialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Press-ups');
  await habitDialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(habitDialog).toBeHidden();

  const unsavedConfigResponse = await page.request.get('/api/users/first-owner/config');
  expect(unsavedConfigResponse.status()).toBe(200);
  expect(await unsavedConfigResponse.json()).toEqual(originalConfig);
  const unsavedDataResponse = await page.request.get('/api/users/first-owner/data');
  expect(unsavedDataResponse.status()).toBe(200);
  expect(await unsavedDataResponse.text()).toBe(originalCsv);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();

  const savedConfigResponse = await page.request.get('/api/users/first-owner/config');
  expect(savedConfigResponse.status()).toBe(200);
  const savedConfig = await savedConfigResponse.json();
  expect(savedConfig.text).toBe(originalConfig.text.replace(/^  Pushups:/m, '  Press-ups:'));
  expect(savedConfig.config.habits).toEqual([
    { ...originalConfig.config.habits[0], name: 'Press-ups' },
  ]);

  await page.getByRole('link', { name: 'Back to dashboard', exact: true }).click();
  await expect(page).toHaveURL('/users/first-owner/habits');
  await expect(page.getByRole('button', { name: 'Add 5 to Press-ups', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add 5 to Pushups', exact: true })).toHaveCount(0);

  const habitsResponse = await page.request.get(
    '/api/users/first-owner/habits?date=2026-11-02&today=2026-11-02',
  );
  expect(habitsResponse.status()).toBe(200);
  expect((await habitsResponse.json()).habits).toEqual([
    expect.objectContaining({
      name: 'Press-ups',
      type: 'summation',
      details: expect.objectContaining({ total: 5 }),
    }),
  ]);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: 'Habits', exact: true }).click();
  await page.getByRole('link', { name: 'View YAML', exact: true }).click();
  await expect(page).toHaveURL('/users/first-owner/settings/config');
  const yamlEditor = page.getByRole('textbox');
  await expect(yamlEditor).toContainText('Press-ups:');
  await expect(yamlEditor).not.toContainText('Pushups:');

  await page.getByRole('link', { name: 'Account', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('first-owner-habsum-data.csv');
  const downloadPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(downloadPath);
  expect(await readFile(downloadPath, 'utf8')).toBe(
    originalCsv.replace('summation_event,Pushups,', 'summation_event,Press-ups,'),
  );
});
