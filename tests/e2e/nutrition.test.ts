/**
 * Nutrition page tests (/user/nutrition).
 *
 * Covers: page load, week navigation, weekly summary, daily log,
 * inline editing a day, the "Set week targets" inline panel,
 * and target template persistence / backwards lookup behaviour.
 */
import { expect, test } from './fixtures';

async function openNav(page: import('@playwright/test').Page) {
  const homeLink = page.getByRole('link', { name: 'Home' }).first();
  const homeAlreadyVisible = await homeLink.waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true).catch(() => false);
  if (homeAlreadyVisible) return;
  await page.getByRole('button', { name: /menu/i }).first().click({ timeout: 10_000 });
  await expect(homeLink).toBeVisible({ timeout: 15_000 });
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

  test('clicking Set week targets opens the inline panel with correct heading', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('heading', { name: 'Week Targets' })).toBeVisible();
  });

  test('Week targets panel shows target applicability copy', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByText('Targets apply from', { exact: false }).first()).toBeVisible();
  });

  test('Week targets panel shows macro target inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByLabel('Energy target')).toBeVisible();
    await expect(page.getByLabel('Protein percent')).toBeVisible();
    await expect(page.getByLabel('Carbs percent')).toBeVisible();
    await expect(page.getByLabel('Fat percent')).toBeVisible();
  });

  test('Week targets panel does not show Steps and Sleep inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByLabel('Steps')).not.toBeVisible();
    await expect(page.getByLabel('Sleep hours')).not.toBeVisible();
    await expect(page.getByLabel('Sleep minutes')).not.toBeVisible();
  });

  test('cancelling the panel closes it', async ({ page }) => {
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Week Targets' })).not.toBeVisible({ timeout: 3_000 });
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

  test('past week shows "View week targets" button and read-only panel', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');

    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(page.getByRole('button', { name: 'View week targets' })).toBeVisible();
    await page.getByRole('button', { name: 'View week targets' }).click();
    await expect(page.getByRole('heading', { name: 'Week Targets' })).toBeVisible({ timeout: 5_000 });
    // Only "Close" — no Save Targets
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Targets' })).not.toBeVisible();
  });

  test('saving targets persists when panel is reopened', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');

    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('heading', { name: 'Week Targets' })).toBeVisible({ timeout: 5_000 });
    await page.getByLabel('Energy target').fill('2200');
    await page.getByLabel('Protein percent').fill('40');
    await page.getByLabel('Carbs percent').fill('30');
    await page.getByLabel('Fat percent').fill('30');
    await page.getByRole('button', { name: 'Save Targets' }).click();
    await expect(page.getByRole('heading', { name: 'Week Targets' })).not.toBeVisible({ timeout: 5_000 });

    // Reopen and confirm value was saved
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByLabel('Energy target')).toHaveValue('2200', { timeout: 5_000 });
    await expect(page.getByLabel('Protein percent')).toHaveValue('40');
    await expect(page.getByLabel('Carbs percent')).toHaveValue('30');
    await expect(page.getByLabel('Fat percent')).toHaveValue('30');
  });

  test('targets carry forward to future weeks (backwards lookup)', async ({ page, browserName, isMobile }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'serial: desktop chromium only');

    // Save a template for the current week via API
    const res = await page.request.post('/api/target-templates', {
      data: {
        effectiveFrom: getCurrentMonday(),
        stepsTarget: null,
        sleepMinsTarget: null,
        days: {
          '1': { caloriesTarget: 2400, proteinTarget: 180, carbsTarget: 240, fatTarget: 80 },
          '2': { caloriesTarget: 2400, proteinTarget: 180, carbsTarget: 240, fatTarget: 80 },
          '3': { caloriesTarget: 2400, proteinTarget: 180, carbsTarget: 240, fatTarget: 80 },
          '4': { caloriesTarget: 2400, proteinTarget: 180, carbsTarget: 240, fatTarget: 80 },
          '5': { caloriesTarget: 2400, proteinTarget: 180, carbsTarget: 240, fatTarget: 80 },
          '6': { caloriesTarget: 2400, proteinTarget: 180, carbsTarget: 240, fatTarget: 80 },
          '7': { caloriesTarget: 2400, proteinTarget: 180, carbsTarget: 240, fatTarget: 80 },
        },
      },
    });
    expect(res.ok()).toBeTruthy();

    // Navigate to next week and open its dialog
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button', { name: 'Set week targets' }).click();
    await expect(page.getByRole('heading', { name: 'Week Targets' })).toBeVisible({ timeout: 5_000 });

    // Backwards lookup should surface the current-week macro template
    await expect(page.getByLabel('Energy target')).toHaveValue('2400', { timeout: 5_000 });
    await expect(page.getByLabel('Protein percent')).toHaveValue('30');
    await expect(page.getByLabel('Carbs percent')).toHaveValue('40');
    await expect(page.getByLabel('Fat percent')).toHaveValue('30');
  });
});
