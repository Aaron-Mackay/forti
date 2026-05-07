/**
 * Auth setup — runs once before the test suite.
 * Authenticates as TestUser (the dedicated E2E account) by calling the
 * NextAuth testuser credentials provider directly via the API, then saves
 * session cookies so all other test files can reuse the authenticated state
 * without re-logging in.
 */
import { test as setup, expect } from './fixtures';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate as TestUser', async ({ page }) => {
  // Step 1: obtain a CSRF token (required by NextAuth for credentials sign-in)
  const csrfResponse = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfResponse.json() as { csrfToken: string };

  // Step 2: call the testuser credentials callback directly — no UI interaction needed
  await page.request.post('/api/auth/callback/testuser', {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({ csrfToken, redirect: 'false', json: 'true' }).toString(),
  });

  // Step 3: navigate to the app and confirm authentication succeeded
  await page.goto('/user');
  await page.waitForURL('/user', { timeout: 15_000 });
  await expect(page).toHaveURL('/user');

  // Persist cookies + localStorage so all other tests skip the login step
  await page.context().storageState({ path: authFile });
});
