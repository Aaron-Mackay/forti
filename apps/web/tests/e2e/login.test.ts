/**
 * Login page tests.
 *
 * These tests intentionally run WITHOUT the authenticated storageState so
 * they exercise the public login page as an unauthenticated visitor would.
 */
import { test, expect } from './fixtures';

// Override the project-level storageState so these tests start logged out
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays the Forti login surface across layouts', async ({ page, isMobile }) => {
    await expect(page.locator('img[src="/forti-icon.svg"]:visible')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Continue with Google/i })
    ).toBeVisible();

    if (!isMobile) {
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    }
  });

  test('shows "Continue with Google" button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Continue with Google/i })
    ).toBeVisible();
  });

  test('shows "Try Demo" button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Try Demo', exact: true })
    ).toBeVisible();
  });

  test('shows "Try Demo (Coach)" button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Try Demo (Coach)', exact: true })
    ).toBeVisible();
  });

  test('redirects unauthenticated users to login when accessing a protected route', async ({
    page,
  }) => {
    await page.goto('/user');
    // Middleware redirects to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to dashboard after demo login', async ({ page }) => {
    await page.getByRole('button', { name: 'Try Demo', exact: true }).click();
    await page.waitForURL('/user', { timeout: 15_000 });
    await expect(page).toHaveURL('/user');
  });
});
