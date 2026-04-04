/**
 * Nutrition page tests (/user/nutrition).
 *
 * Covers: page load, week navigation, weekly summary, daily log,
 * inline editing a day, and the "Set week targets" dialog (7-day template grid).
 */
import { expect, test } from './fixtures';

test.describe('Nutrition page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/nutrition');
  });

  test('renders the Nutrition app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Nutrition');
  });

  test('shows the weekly summary section', async ({ page }) => {
    await expect(page.getByText('This week — average', { exact: false }).first()).toBeVisible();
  });

  test('shows all four macros in the weekly summary', async ({ page }) => {
    await expect(page.getByText('Calories', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Protein', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Carbs', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Fat', { exact: true }).first()).toBeVisible();
  });

  test('shows the Daily log section', async ({ page }) => {
    await expect(page.getByText('Daily log', { exact: false }).first()).toBeVisible();
  });

  test('shows 7 day cards in the daily log', async ({ page }) => {
    // Each day card shows a formatted date like "Mon 1 Jan"
    const dayCards = page.locator('[data-testid="nutrition-day-card"], .MuiCard-root').filter({
      hasText: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+ \w+/,
    });
    await expect(dayCards).toHaveCount(7, { timeout: 5_000 });
  });

  test('shows previous and next week navigation buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Previous week' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next week' })).toBeVisible();
  });

  test('navigating to next week changes the week label', async ({ page }) => {
    const weekLabel = page.locator('text=/Week \\d+/').first();
    const initial = await weekLabel.textContent();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(weekLabel).not.toHaveText(initial ?? '');
  });

  test('navigating back to previous week restores original label', async ({ page }) => {
    const weekLabel = page.locator('text=/Week \\d+/').first();
    const initial = await weekLabel.textContent();
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(weekLabel).toHaveText(initial ?? '');
  });

  test('shows the Set week targets button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Set week targets' })).toBeVisible();
  });

  test('clicking Set week targets opens the dialog with correct heading', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('heading', { name: 'Week Targets' })).toBeVisible();
  });

  test('Week targets dialog shows 7 day rows (Mon–Sun)', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      await expect(page.getByText(day, { exact: true }).first()).toBeVisible();
    }
  });

  test('Week targets dialog shows column headers Cal, Pro, Carb, Fat', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    for (const col of ['Cal', 'Pro', 'Carb', 'Fat']) {
      await expect(page.getByText(col, { exact: true }).first()).toBeVisible();
    }
  });

  test('Week targets dialog has Steps target and Sleep target inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel('Steps target')).toBeVisible();
    await expect(page.getByLabel('Sleep target (mins)')).toBeVisible();
  });

  test('cancelling the dialog closes it', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  test('each day card has an edit button', async ({ page }) => {
    const editButtons = page.getByRole('button', { name: 'Edit' });
    await expect(editButtons.first()).toBeVisible({ timeout: 5_000 });
    await expect(editButtons).toHaveCount(7);
  });

  test('clicking edit on a day card opens the inline editor with macro actuals fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByLabel('Calories (kcal)')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByLabel('Protein (g)')).toBeVisible();
  });

  test('day editor does not show nutrition target input fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByLabel('Calories target (kcal)')).not.toBeVisible({ timeout: 3_000 });
    await expect(page.getByLabel('Protein target (g)')).not.toBeVisible();
  });

  test('cancelling inline edit closes it', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByLabel('Calories (kcal)')).not.toBeVisible({ timeout: 3_000 });
  });

  test('Nutrition link is present in the nav drawer', async ({ page }) => {
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByRole('link', { name: 'Nutrition' })).toBeVisible({ timeout: 3_000 });
  });
});
