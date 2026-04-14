/**
 * Coach check-in review tests (/user/coach/check-ins).
 *
 * Covers: page rendering, New/Browse tabs, unreviewed badge count,
 * check-in list rendering, dedicated review page, coach notes submission,
 * and reviewed state.
 *
 * All API calls are mocked to avoid dependency on seeded DB state
 * or the TestUser having a coach relationship.
 */
import { test, expect } from './fixtures';

const UNREVIEWED_CHECK_IN = {
  id: 10,
  userId: 'client-1',
  weekStartDate: '2026-03-09T00:00:00.000Z',
  completedAt: '2026-03-14T10:00:00.000Z',
  energyLevel: 4,
  moodRating: 3,
  stressLevel: 2,
  sleepQuality: 4,
  recoveryRating: 3,
  adherenceRating: 5,
  completedWorkouts: 3,
  plannedWorkouts: 4,
  weekReview: 'Good week overall',
  coachMessage: 'How did my technique look?',
  goalsNextWeek: 'More sleep',
  coachNotes: null,
  coachResponseUrl: null,
  coachReviewedAt: null,
  user: { id: 'client-1', name: 'Alice Smith' },
};

const REVIEWED_CHECK_IN = {
  ...UNREVIEWED_CHECK_IN,
  id: 11,
  coachNotes: 'Great progress this week!',
  coachReviewedAt: '2026-03-15T09:00:00.000Z',
  user: { id: 'client-1', name: 'Alice Smith' },
};

const CLIENTS = [{ id: 'client-1', name: 'Alice Smith', email: 'alice@example.com' }];
const CHECK_INS_ROUTE = /\/api\/coach\/check-ins(?:\?.*)?$/;
const CHECK_IN_10_ROUTE = /\/api\/coach\/check-ins\/10(?:\?.*)?$/;
const CHECK_IN_10_NOTES_ROUTE = /\/api\/coach\/check-ins\/10\/notes(?:\?.*)?$/;
const CHECK_IN_11_ROUTE = /\/api\/coach\/check-ins\/11(?:\?.*)?$/;

function makeApiResponse(checkIns: typeof UNREVIEWED_CHECK_IN[]) {
  return { checkIns, total: checkIns.length, clients: CLIENTS };
}

function makeDetailApiResponse(checkIn: typeof UNREVIEWED_CHECK_IN) {
  return {
    checkIn,
    currentWeek: [],
    weekPrior: [],
    weekTargets: null,
    activeTemplate: null,
    customMetricDefs: [],
    weekWorkouts: [],
  };
}

test.describe('Coach check-ins page — basic rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(CHECK_INS_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeApiResponse([UNREVIEWED_CHECK_IN])),
      }),
    );
    await page.goto('/user/coach/check-ins');
  });

  test('renders the coach check-ins tabs', async ({ page }) => {
    await expect(page.getByRole('tablist')).toBeVisible();
  });

  test('shows New and Browse tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /New/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Browse/i })).toBeVisible();
  });

  test('New tab shows a badge chip with unreviewed count', async ({ page }) => {
    // The badge chip renders the count of unreviewed check-ins
    await expect(page.getByRole('tab', { name: /New/i })
      .locator('.MuiChip-root')).toContainText('1');
  });

  test('shows check-in list item for the unreviewed client check-in', async ({ page }) => {
    await expect(page.getByText('Alice Smith').first()).toBeVisible();
  });
});

test.describe('Coach check-ins — dedicated review page', () => {
  test('clicking a list item opens the dedicated check-in review page', async ({ page }) => {
    await page.route(/\/api\/coach\/check-ins(?:\/10)?(?:\?.*)?$/, (route) => {
      const url = route.request().url();
      if (url.includes('/api/coach/check-ins/10')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(makeDetailApiResponse(UNREVIEWED_CHECK_IN)),
        });
        return;
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeApiResponse([UNREVIEWED_CHECK_IN])),
      });
    });

    await page.goto('/user/coach/check-ins');
    await page.getByRole('link', { name: /Alice Smith/i }).click();

    await expect(page).toHaveURL('/user/coach/check-ins/10');
    await expect(page.getByRole('heading', { name: 'Alice Smith' })).toBeVisible();
    await expect(page.getByText('Week review')).toBeVisible();
  });
});

test.describe('Coach check-ins — adding notes to a check-in', () => {
  test('sending review from the dedicated page calls PATCH /api/coach/check-ins/{id}/notes', async ({ page }) => {
    let patchCalled = false;
    let patchBody: Record<string, unknown> | null = null;

    await page.route(CHECK_IN_10_NOTES_ROUTE, (route) => {
      patchCalled = true;
      patchBody = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ coachNotes: 'Well done this week', coachReviewedAt: new Date().toISOString() }),
      });
    });
    await page.route(CHECK_IN_10_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeDetailApiResponse(UNREVIEWED_CHECK_IN)),
      }),
    );

    await page.goto('/user/coach/check-ins/10');

    const notesField = page.getByPlaceholder(/Leave feedback for your client/i);
    await notesField.fill('Well done this week');
    await page.getByLabel(/Review link/i).fill('https://www.loom.com/share/test-review');

    const saveBtn = page.getByRole('button', { name: /Send Review/i });
    await expect(saveBtn).not.toBeDisabled();
    await saveBtn.click();

    expect(patchCalled).toBe(true);
    expect(patchBody).toMatchObject({
      coachNotes: 'Well done this week',
      coachResponseUrl: 'https://www.loom.com/share/test-review',
    });
  });
});

test.describe('Coach check-ins — reviewed state', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(CHECK_IN_11_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeDetailApiResponse(REVIEWED_CHECK_IN)),
      }),
    );
    await page.goto('/user/coach/check-ins/11');
  });

  test('reviewed check-in page renders with client name', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Alice Smith' })).toBeVisible();
  });

  test('reviewed check-in page shows pre-filled coach notes', async ({ page }) => {
    // The notes field should show the existing coach notes
    const notesField = page.getByPlaceholder(/Leave feedback for your client/i);
    await expect(notesField).toHaveValue('Great progress this week!');
  });

  test('Send Review button is disabled when values are unchanged', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Send Review/i })).toBeDisabled();
  });
});

test.describe('Coach check-ins — Browse tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(CHECK_INS_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeApiResponse([])),
      }),
    );
    await page.goto('/user/coach/check-ins');
  });

  test('Browse tab shows filter controls', async ({ page }) => {
    await page.getByRole('tab', { name: /Browse/i }).click();
    await expect(page.getByRole('button', { name: /Search/i })).toBeVisible();
  });

  test('Browse tab shows date filter fields', async ({ page }) => {
    await page.getByRole('tab', { name: /Browse/i }).click();
    await expect(page.locator('input[type="date"]').nth(0)).toBeVisible();
    await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
  });
});
