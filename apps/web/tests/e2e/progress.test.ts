import { test, expect } from './fixtures';
import { Exercise } from '@prisma/client';

test.describe.configure({ mode: 'serial' });

test.describe('Progress', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal progress coverage runs on desktop chromium only; tracked-exercise settings are shared');

  let trackedExercise: { id: number; name: string } | null = null;

  test.beforeEach(async ({ page }) => {
    const exercisesResponse = await page.request.get('/api/exercises');
    expect(exercisesResponse.ok()).toBeTruthy();
    const exercises = await exercisesResponse.json() as Exercise[];
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

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Progress').first()).toBeVisible();
    await expect(page.getByText('Review your trend lines')).toBeVisible();
    await expect(page.getByText('Bodyweight, calories, and steps')).toBeVisible();
    await expect(page.getByText('Tracked lifting trends')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit tracked lifts' })).toBeVisible();
    await expect(
      page.locator('.apexcharts-canvas').first().or(
        page.getByText('No chart to show yet. Log daily metrics or re-enable charts in settings.'),
      ),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(trackedExercise?.name ?? '').first()).toBeVisible();
  });
});
