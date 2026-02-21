/**
 * Login page tests.
 *
 * These tests intentionally run WITHOUT the authenticated storageState so
 * they exercise the public login page as an unauthenticated visitor would.
 */
import { test, expect } from '@playwright/test';

// Override the project-level storageState so these tests start logged out
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays the Forti branding and sign-in heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    // The card-level "Forti" heading is visible on small viewports
    const fortiHeading = page.getByRole('heading', { name: 'Forti' });
    // Either the page-level card heading or the left-panel heading is present
    await expect(fortiHeading.or(page.getByText('Welcome to Forti'))).toBeVisible();
  });

  test('shows "Continue with Google" button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Continue with Google/i })
    ).toBeVisible();
  });

  test('shows "Try Demo" button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Try Demo/i })
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
    await page.getByRole('button', { name: /Try Demo/i }).click();
    await page.waitForURL('/user', { timeout: 15_000 });
    await expect(page).toHaveURL('/user');
  });
});
