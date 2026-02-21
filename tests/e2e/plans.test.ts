/**
 * Training plans tests (/user/plan and /user/plan/[planId]).
 *
 * Covers: plan listing, navigating into a plan, viewing weeks/workouts,
 * and toggling edit mode.
 */
import { test, expect } from '@playwright/test';

test.describe('Plans list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/plan');
  });

  test('renders the Plans app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Plans');
  });

  test("shows the demo user's plans section", async ({ page }) => {
    // Seed creates "Bob's Plans" section header
    await expect(page.getByText(/Bob's Plans/i)).toBeVisible();
  });

  test('lists at least one plan for the demo user', async ({ page }) => {
    // Seed creates two plans per user; each is a list item button
    const planLinks = page.getByRole('button').filter({ hasText: /Plan/i });
    await expect(planLinks.first()).toBeVisible();
  });

  test('navigates to a plan detail page when a plan is clicked', async ({ page }) => {
    const firstPlan = page.getByRole('listitem').first();
    const planLink = firstPlan.getByRole('link');
    await planLink.click();
    // Should land on /user/plan/<id>
    await expect(page).toHaveURL(/\/user\/plan\/\d+/);
  });
});

test.describe('Plan detail page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate via the plans listing to ensure we land on a real plan id
    await page.goto('/user/plan');
    const firstPlanLink = page.getByRole('listitem').first().getByRole('link');
    await firstPlanLink.click();
    await page.waitForURL(/\/user\/plan\/\d+/);
  });

  test('renders the Plan app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Plan');
  });

  test("shows the demo user's name in the plan heading", async ({ page }) => {
    await expect(page.getByText(/User: Bob/i)).toBeVisible();
  });

  test('displays at least one week', async ({ page }) => {
    // Seed creates 2-3 weeks per plan; each Week renders a "Week N" heading
    await expect(page.getByText(/Week \d+/i).first()).toBeVisible();
  });

  test('displays workouts inside a week', async ({ page }) => {
    await expect(page.getByText(/Workout/i).first()).toBeVisible();
  });

  test('shows the Edit toggle button in view mode', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Edit/i })).toBeVisible();
  });

  test('clicking Edit enables edit mode and reveals Save button', async ({ page }) => {
    await page.getByRole('button', { name: /Edit/i }).click();
    await expect(page.getByRole('button', { name: /Save/i })).toBeVisible();
  });

  test('edit mode reveals Add Week button', async ({ page }) => {
    await page.getByRole('button', { name: /Edit/i }).click();
    await expect(page.getByRole('button', { name: /Add Week/i })).toBeVisible();
  });
});
