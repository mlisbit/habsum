import { expect, test } from '@playwright/test';

for (const path of ['/', '/welcome']) {
  test(`shows login for ${path} when HABSUM_INITIAL_WEB_SIGNUP is unset`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Log in', exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Username or email', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toHaveCount(0);
  });
}
