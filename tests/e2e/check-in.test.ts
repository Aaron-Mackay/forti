/**
 * Check-in page tests (/user/check-in).
 *
 * Covers: page rendering, form visibility when no check-in exists,
 * submitting a check-in, viewing history, and empty-history state.
 *
 * All API calls are mocked to avoid dependency on seeded DB state.
 */
import { test, expect } from './fixtures';

function getIsoWeekStart(weeksAgo = 0): string {
  const date = new Date();
  const day = (date.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - day - (weeksAgo * 7));
  return date.toISOString();
}

const CURRENT_WEEK = getIsoWeekStart(0);
const PREV_WEEK = getIsoWeekStart(1);

function makeCurrentResponse(completed: boolean) {
  return {
    checkIn: {
      id: 1,
      userId: 'test',
      weekStartDate: CURRENT_WEEK,
      completedAt: completed ? '2026-03-20T10:00:00.000Z' : null,
      energyLevel: completed ? 4 : null,
      moodRating: null,
      stressLevel: null,
      sleepQuality: null,
      recoveryRating: null,
      adherenceRating: null,
      completedWorkouts: completed ? 3 : null,
      plannedWorkouts: completed ? 4 : null,
      weekReview: null,
      coachMessage: null,
      goalsNextWeek: null,
      coachNotes: null,
      coachReviewedAt: null,
    },
    currentWeek: [],
    weekPrior: [],
    previousPhotos: null,
    weekTargets: null,
    completedWorkoutsCount: completed ? 3 : 0,
    plannedWorkoutsCount: completed ? 4 : 0,
    activePlanId: null,
    template: null,
  };
}

const PAST_CHECK_IN = {
  id: 2,
  userId: 'test',
  weekStartDate: PREV_WEEK,
  completedAt: new Date(Date.parse(PREV_WEEK) + (5 * 24 * 60 * 60 * 1000)).toISOString(),
  energyLevel: 4,
  moodRating: 3,
  stressLevel: 2,
  sleepQuality: 4,
  recoveryRating: 3,
  adherenceRating: 5,
  completedWorkouts: 3,
  plannedWorkouts: 4,
  weekReview: 'Good week overall',
  coachMessage: null,
  goalsNextWeek: null,
  coachNotes: null,
  coachReviewedAt: null,
};

test.describe('Check-in page — form not yet submitted', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/check-in/current', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeCurrentResponse(false)),
      }),
    );
    await page.route(/\/api\/check-in\?/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checkIns: [], total: 0 }),
      }),
    );
    await page.goto('/user/check-in');
  });

  test('renders the Check-in app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Check-in');
  });

  test('shows the This Week section', async ({ page }) => {
    await expect(page.getByText(/This Week/i).first()).toBeVisible();
  });

  test('shows the Submit Check-in button when not yet submitted', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Submit Check-in/i })).toBeVisible();
  });

  test('shows empty history message when no previous check-ins', async ({ page }) => {
    await expect(page.getByText(/No previous check-ins yet/i)).toBeVisible();
  });
});

test.describe('Check-in page — already submitted', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/check-in/current', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeCurrentResponse(true)),
      }),
    );
    await page.route(/\/api\/check-in\?/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checkIns: [], total: 0 }),
      }),
    );
    await page.goto('/user/check-in');
  });

  test('shows Check-in complete when already submitted', async ({ page }) => {
    await expect(page.getByText(/Check-in complete/i)).toBeVisible();
  });

  test('still shows the submitted check-in details when already submitted', async ({ page }) => {
    await expect(page.getByText(/Ratings/i)).toBeVisible();
  });

  test('does not show the Submit Check-in button when already submitted', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Submit Check-in/i })).not.toBeVisible();
  });
});

test.describe('Check-in page — form submission', () => {
  test('submitting the form calls POST /api/check-in and then shows complete state', async ({ page }) => {
    let postCalled = false;
    let callCount = 0;

    await page.route('**/api/check-in/current', (route) => {
      callCount++;
      // First call: not yet submitted; subsequent calls: completed
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeCurrentResponse(callCount > 1)),
      });
    });

    await page.route(/\/api\/check-in\?/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checkIns: [], total: 0 }),
      }),
    );

    await page.route(/\/api\/check-in$/, (route) => {
      if (route.request().method() === 'POST') {
        postCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1 }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/user/check-in');
    await page.getByRole('button', { name: /Submit Check-in/i }).click();

    expect(postCalled).toBe(true);
    await expect(page.getByText(/Check-in complete/i)).toBeVisible();
    await expect(page.getByText(/Ratings/i)).toBeVisible();
  });
});

test.describe('Check-in page — history', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/check-in/current', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeCurrentResponse(true)),
      }),
    );
    await page.route(/\/api\/check-in\?/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        // total=2 so historyTotal = 2-1 = 1 (matching the 1 past item returned)
        body: JSON.stringify({ checkIns: [PAST_CHECK_IN], total: 2 }),
      }),
    );
    await page.goto('/user/check-in');
  });

  test('shows the Previous Check-ins section', async ({ page }) => {
    await expect(page.getByText(/Previous Check-ins/i).first()).toBeVisible();
  });

  test('renders history accordion cards for past check-ins', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Week of .*Submitted/i })).toBeVisible();
  });
});
