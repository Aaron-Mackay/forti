import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

async function firstWorkoutEntryUrl(page: import('@playwright/test').Page) {
  const dataRes = await page.request.get('/api/workout-data');
  expect(dataRes.ok()).toBe(true);
  const data = await dataRes.json();
  const weekId: number | undefined = data.plans?.[0]?.weeks?.[0]?.id;
  expect(weekId).toBeTruthy();
  return `/user/workout?weekId=${weekId}`;
}

test.describe('Workout Signal', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal workout coverage runs on desktop chromium only; user settings are shared');

  test.beforeEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: true,
          coachModeActive: false,
        },
      },
    });

    const dataRes = await page.request.get('/api/workout-data');
    if (dataRes.ok()) {
      const data = await dataRes.json();
      const firstPlanId: number | undefined = data.plans?.[0]?.id;
      if (firstPlanId) {
        await page.request.patch('/api/plan/active', { data: { planId: firstPlanId } });
      }
    }
  });

  test.afterEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: false,
        },
      },
    });
  });

  test('flagged user sees the Signal gym surface on the workout route', async ({ page }) => {
    await page.goto(await firstWorkoutEntryUrl(page));

    await expect(page.locator('[data-signal-surface="gym"]').first()).toBeVisible();

    // Workouts list: gym surface with "Select a workout"
    await expect(page.getByText('Select a workout').first()).toBeVisible();
    // Click "Workout A" or whatever the first workout is
    await page.locator('button').filter({ hasText: 'Workout A' }).first().click();

    // Exercises list: gym surface with "Exercises" heading, add button, and complete CTA
    await expect(page.getByText('Exercises').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /add exercise/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mark as complete|completed/i })).toBeVisible();
  });

  test('exercise detail sheet exposes the history exclusion toggle', async ({ page }) => {
    await page.goto(await firstWorkoutEntryUrl(page));

    // Navigate to exercises list from the direct week URL.
    await page.locator('button').filter({ hasText: 'Workout A' }).first().click();

    // Click the first exercise row to enter the slide
    await expect(page.getByText('Exercises').first()).toBeVisible();
    await page.getByRole('button', { name: /Bench Press/i }).click();

    // Slide is visible — click the exercise name button to open the detail sheet
    const nameBtn = page.locator('button[aria-haspopup="dialog"]').first();
    await expect(nameBtn).toBeVisible();
    await nameBtn.click();

    // Detail sheet appears with the Progress section and the exclusion toggle
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('Progress')).toBeVisible();
    await expect(sheet.getByRole('button', { name: /exclude this session from history/i })).toBeVisible();
  });
});
