/**
 * Auth setup — runs once before the test suite.
 * Logs in via the Demo button and saves session cookies so all other
 * test files can reuse the authenticated state without re-logging in.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate as demo user', async ({ page }) => {
  await page.goto('/login');

  // The "Try Demo" button calls signIn("demo", { callbackUrl: "/user" })
  await page.getByRole('button', { name: 'Try Demo' }).click();

  // NextAuth redirects to /user after successful demo login
  await page.waitForURL('/user', { timeout: 15_000 });
  await expect(page).toHaveURL('/user');

  // Persist cookies + localStorage so all other tests skip the login step
  await page.context().storageState({ path: authFile });
});
