import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Check-in Signal', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal check-in coverage runs on desktop chromium only; user settings are shared');

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

  test('flagged user sees the Signal planning surface on the check-in route', async ({ page }) => {
    function getIsoWeekStart(): string {
      const date = new Date();
      const day = (date.getUTCDay() + 6) % 7;
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - day);
      return date.toISOString();
    }

    await page.route('**/api/check-in/current', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checkIn: {
            id: 1,
            userId: 'test',
            weekStartDate: getIsoWeekStart(),
            completedAt: null,
            energyLevel: null,
            moodRating: null,
            stressLevel: null,
            sleepQuality: null,
            recoveryRating: null,
            adherenceRating: null,
            completedWorkouts: null,
            plannedWorkouts: null,
            weekReview: null,
            coachMessage: null,
            goalsNextWeek: null,
            customResponses: null,
            templateSnapshot: null,
            coachNotes: null,
            coachResponseUrl: null,
            coachReviewedAt: null,
            frontPhotoUrl: null,
            backPhotoUrl: null,
            sidePhotoUrl: null,
          },
          currentWeek: [],
          weekPrior: [],
          previousPhotos: null,
          weekTargets: null,
          completedWorkoutsCount: 0,
          plannedWorkoutsCount: 0,
          workoutSummaries: [],
          activePlanId: null,
          template: null,
        }),
      }),
    );
    await page.route(/\/api\/check-in(?:\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checkIns: [], total: 0 }),
      }),
    );

    await page.goto('/user/check-in');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(page.getByText('Weekly check-in').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Submit Check-in/i })).toBeVisible();
    await expect(page.getByText(/No previous check-ins yet/i).first()).toBeVisible();
  });
});
