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
    await expect(page.getByText(/Welcome Bob/i).first()).toBeVisible();
  });

  test('renders the metrics chart container', async ({ page }) => {
    // The chart SVG or its wrapper is present once data loads
    await expect(page.locator('.apexcharts-canvas')).toBeVisible({ timeout: 10_000 });
  });

  test('authenticated user is NOT redirected to login', async ({ page }) => {
    await expect(page).toHaveURL('/user');
  });

  test.describe('DashboardCards', () => {
    test('renders the Next Workout card linking to the workout', async ({ page }) => {
      // Seed data: Week 1 of each plan is always completed; Week 2 is always incomplete
      await expect(page.getByText('Next Workout').first()).toBeVisible();
      // The entire card is now a clickable link — no separate "Go" button
      await expect(page.getByRole('link').filter({ hasText: 'Next Workout' })).toBeVisible();
      // Week number displayed should match week.order (1-indexed, no +1 offset).
      // The workout name also contains "Week 2", so scope to the subtitle which uses · separators.
      await expect(page.getByText(/· Week 2/).first()).toBeVisible();
    });

    test('Next Workout card links to the workout page with a workoutId param', async ({ page }) => {
      const cardLink = page.getByRole('link').filter({ hasText: 'Next Workout' });
      await expect(cardLink).toHaveAttribute('href', /^\/user\/workout\?workoutId=\d+$/);
    });

    test('Next Workout card is not clipped by card overflow', async ({ page }) => {
      await expect(page.getByRole('link').filter({ hasText: 'Next Workout' })).toBeInViewport();
    });

    test('renders the Today card with metric buttons', async ({ page }) => {
      // Use first() to avoid strict mode violation — "Today" can appear more than once
      // on the page (e.g. in the chart canvas or other DOM nodes).
      await expect(page.getByText('Today').first()).toBeVisible();
      // Today card always shows metric icon buttons regardless of whether metrics are logged
      const todayCard = page.locator('.MuiCard-root').filter({ hasText: 'Today' }).first();
      await expect(todayCard.getByRole('button').first()).toBeVisible();
    });

    test('Today card metric buttons are not clipped by card overflow', async ({ page }) => {
      const todayCard = page.locator('.MuiCard-root').filter({ hasText: 'Today' }).first();
      await expect(todayCard.getByRole('button').first()).toBeInViewport();
    });

    test('clicking a Today metric button opens the input drawer', async ({ page }) => {
      const todayCard = page.locator('.MuiCard-root').filter({ hasText: 'Today' }).first();
      // First button is weight — always has a click handler
      await todayCard.getByRole('button').first().click();
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    });

    test('renders the This Week training count card', async ({ page }) => {
      await expect(page.getByText('This Week').first()).toBeVisible();
      // Scope to the specific card to avoid matching the "Welcome Bob" h4
      const thisWeekCard = page.locator('.MuiCard-root').filter({ hasText: 'This Week' }).first();
      const countEl = thisWeekCard.locator('h4');
      const text = await countEl.textContent();
      expect(Number(text)).toBeGreaterThanOrEqual(0);
    });

    test('does not render an Active Block card when no block is active', async ({ page }) => {
      // Seed uses a fixed date of 2024-06-01 so all blocks are well past CI's real today (~2026)
      await expect(page.getByText('Active Block')).not.toBeVisible();
    });

    test('does not render an Upcoming Events card when no events fall within 7 days', async ({ page }) => {
      // Seed uses a fixed date of 2024-06-01 so all events are well past CI's real today (~2026)
      await expect(page.getByText('Upcoming (7 days)')).not.toBeVisible();
    });
  });
});
