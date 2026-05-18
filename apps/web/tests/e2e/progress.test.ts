import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Progress', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal progress coverage runs on desktop chromium only; tracked-exercise settings are shared');

  let trackedExercise: { id: number; name: string } | null = null;

  test.beforeEach(async ({ page }) => {
    const exercisesResponse = await page.request.get('/api/exercises');
    expect(exercisesResponse.ok()).toBeTruthy();
    const exercises = await exercisesResponse.json() as Array<{ id: number; name: string }>;
    trackedExercise = { id: exercises[0].id, name: exercises[0].name };

    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: true,
          coachModeActive: false,
          showMetricsChart: true,
          showE1rmProgress: true,
          trackedE1rmExercises: [trackedExercise],
        },
      },
    });
  });

  test.afterEach(async ({ page }) => {
    await page.request.patch('/api/user/settings', {
      data: {
        settings: {
          signalUiEnabled: false,
          showMetricsChart: true,
          showE1rmProgress: true,
          trackedE1rmExercises: [],
        },
      },
    });
  });

  test('flagged user sees the Signal progress route', async ({ page }) => {
    await page.goto('/user/progress');

    const surface = page.locator('[data-signal-surface="planning"]').first();

    await expect(surface).toBeVisible();
    await expect(surface.getByText('Train', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Strength' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bodyweight & metrics' })).toBeVisible();
    await expect(page.getByText('Focus exercises').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit focus exercises' })).toBeVisible();
    await expect(page.getByRole('button', { name: /search all exercises/i })).toBeVisible();
    await expect(page.getByText(trackedExercise?.name ?? '').first()).toBeVisible();
  });

  test('Browse all link opens the exercise browse sheet with a searchable list', async ({ page }) => {
    await page.goto('/user/progress');

    // Focus exercises panel exposes a browse action for the exercise sheet
    const browseLink = page.getByRole('button', { name: /search all exercises/i });
    await expect(browseLink).toBeVisible();
    await browseLink.click();

    // Sheet dialog opens with exercise list
    const sheet = page.getByRole('dialog', { name: /browse exercises/i });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('All exercises')).toBeVisible();

    // Search box is present
    await expect(sheet.getByPlaceholder(/search exercises/i)).toBeVisible();

    // Exercise list loads (at least one exercise row or empty state)
    await expect(
      sheet.getByText('No exercises found')
        .or(sheet.locator('button').nth(2)),
    ).toBeVisible({ timeout: 8_000 });

    // Close with ×
    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog', { name: /browse exercises/i })).not.toBeVisible();
  });
});
