import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

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
    await page.goto('/user/workout');

    await expect(page.locator('[data-signal-surface="gym"]').first()).toBeVisible();

    // Plans list: gym surface with "Your plans" heading
    await expect(page.getByText('Your plans').first()).toBeVisible();
    await expect(page.getByText('Training').first()).toBeVisible();

    // Navigate into the first plan — find by Plan N text in the plan row buttons
    await page.locator('button').filter({ hasText: "Plan 1" }).first().click();

    // Weeks list: gym surface with "Select a week"
    await expect(page.getByText('Select a week').first()).toBeVisible();
    // Click the first week button (Signal rows render "Week N" exactly)
    await page.locator('button').filter({ hasText: 'Week 1' }).first().click();

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
    await page.goto('/user/workout');

    // Navigate to exercises list
    await page.locator('button').filter({ hasText: 'Plan 1' }).first().click();
    await page.locator('button').filter({ hasText: 'Week 1' }).first().click();
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
