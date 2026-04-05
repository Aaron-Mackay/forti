/**
 * Nutrition page tests (/user/nutrition).
 *
 * Covers: page load, week navigation, weekly summary, daily log,
 * inline editing a day, the "Set week targets" dialog (7-day template grid),
 * and target template persistence / backwards lookup behaviour.
 */
import { expect, test } from './fixtures';

async function openNav(page: import('@playwright/test').Page) {
  const menuButton = page.getByRole('button', { name: /menu/i });
  const hasVisibleMenuButton = await menuButton.isVisible().catch(() => false);
  if (hasVisibleMenuButton) {
    await menuButton.click({ timeout: 3_000 }).catch(() => {});
  }
  await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();
}

// ---------------------------------------------------------------------------
// Helper — returns the ISO Monday of the current week as YYYY-MM-DD
// ---------------------------------------------------------------------------
function getCurrentMonday(): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

// Blank template body — clears any saved targets for the current week
function blankTemplate() {
  const days: Record<string, Record<string, never>> = {};
  for (let d = 1; d <= 7; d++) days[String(d)] = {};
  return { effectiveFrom: getCurrentMonday(), stepsTarget: null, sleepMinsTarget: null, days };
}

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
    await openNav(page);
    await expect(page.getByRole('link', { name: 'Nutrition' })).toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// Behavioural tests — target template persistence and backwards lookup.
// These mutate DB state so they run serially on desktop Chromium only.
// ---------------------------------------------------------------------------
test.describe('Nutrition — target template behaviour', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Ensure TestUser starts each test with a clean (all-null) template
    await page.goto('/user');
    await page.request.post('/api/target-templates', { data: blankTemplate() });
    await page.goto('/user/nutrition');
  });

  test.afterEach(async ({ page }) => {
    // Reset so subsequent runs start clean
    await page.request.post('/api/target-templates', { data: blankTemplate() });
  });

  test('past week shows "View week targets" button and read-only dialog', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');

    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(page.getByRole('button', { name: 'View week targets' })).toBeVisible();
    await page.getByRole('button', { name: 'View week targets' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    // Only "Close" — no Save Targets
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Targets' })).not.toBeVisible();
  });

  test('saving targets persists when dialog is reopened', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');

    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await page.getByLabel('Steps target').fill('8500');
    await page.getByRole('button', { name: 'Save Targets' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });

    // Reopen and confirm value was saved
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByLabel('Steps target')).toHaveValue('8500', { timeout: 5_000 });
  });

  test('targets carry forward to future weeks (backwards lookup)', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');

    // Save a template for the current week via API
    const res = await page.request.post('/api/target-templates', {
      data: {
        effectiveFrom: getCurrentMonday(),
        stepsTarget: 12000,
        sleepMinsTarget: 450,
        days: { '1': {}, '2': {}, '3': {}, '4': {}, '5': {}, '6': {}, '7': {} },
      },
    });
    expect(res.ok()).toBeTruthy();

    // Navigate to next week and open its dialog
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Backwards lookup should surface the current-week template
    await expect(page.getByLabel('Steps target')).toHaveValue('12000', { timeout: 5_000 });
    await expect(page.getByLabel('Sleep target (mins)')).toHaveValue('450', { timeout: 5_000 });
  });
});
