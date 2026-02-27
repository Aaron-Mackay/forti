/**
 * Dashboard page tests (/user).
 *
 * Verifies the authenticated user lands on a working dashboard that shows
 * their name, the welcome greeting, the main chart container, and the
 * summary cards added by DashboardCards.
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

  test.describe('DashboardCards', () => {
    test('renders the Next Workout card with a Go button', async ({ page }) => {
      // Seed data: 10 workouts with random completion; at least one is always incomplete
      await expect(page.getByText('Next Workout')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Go' })).toBeVisible();
    });

    test('Go button links to the workout page', async ({ page }) => {
      const goLink = page.getByRole('link', { name: 'Go' });
      await expect(goLink).toHaveAttribute('href', '/user/workout');
    });

    test('renders the Today card', async ({ page }) => {
      await expect(page.getByText('Today')).toBeVisible();
      // Seed data: today's metrics may or may not be logged (random) — both states are valid
      const hasMetrics = await page.getByRole('link', { name: 'View calendar' }).isVisible();
      const noMetrics = await page.getByRole('link', { name: 'Log metrics' }).isVisible();
      expect(hasMetrics || noMetrics).toBe(true);
    });

    test('Log metrics button is not clipped when no metrics are logged today', async ({ page }) => {
      const logMetrics = page.getByRole('link', { name: 'Log metrics' });
      const isVisible = await logMetrics.isVisible();
      if (!isVisible) {
        // Today already has metrics logged — nothing to assert
        return;
      }
      await expect(logMetrics).toBeInViewport();
    });

    test('renders the This Week training count card', async ({ page }) => {
      await expect(page.getByText('This Week')).toBeVisible();
      // The count is an h4 containing a non-negative integer
      const countEl = page.locator('h4').first();
      const text = await countEl.textContent();
      expect(Number(text)).toBeGreaterThanOrEqual(0);
    });

    test('does not render an Active Block card when no block is active', async ({ page }) => {
      // Seed blocks are Bulk (Aug 2025) and Cut (Sep 2025) — both past in CI
      await expect(page.getByText('Active Block')).not.toBeVisible();
    });

    test('does not render an Upcoming Events card when no events fall within 7 days', async ({ page }) => {
      // All seed events are in 2025 — none fall within 7 days of today in CI
      await expect(page.getByText('Upcoming (7 days)')).not.toBeVisible();
    });
  });
});
