/**
 * Dashboard page tests (/user).
 *
 * Verifies the authenticated user lands on a working dashboard that shows
 * their name, the welcome greeting, and the main chart container.
 */
import { test, expect } from './fixtures';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user');
  });

  test('renders the Dashboard app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Dashboard');
  });

  test('shows a personalised welcome greeting for the demo user', async ({ page }) => {
    // Seed data: demo user is Bob — greeting should contain "Bob"
    await expect(page.getByText(/Welcome Bob/i)).toBeVisible();
  });

  test('renders the metrics chart container', async ({ page }) => {
    // The chart SVG or its wrapper is present once data loads
    await expect(page.locator('.apexcharts-canvas')).toBeVisible({ timeout: 10_000 });
  });

  test('authenticated user is NOT redirected to login', async ({ page }) => {
    await expect(page).toHaveURL('/user');
  });
});
