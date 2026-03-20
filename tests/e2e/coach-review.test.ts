/**
 * Coach check-in review tests (/user/coach/check-ins).
 *
 * Covers: page rendering, New/Browse tabs, unreviewed badge count,
 * check-in card rendering, coach notes submission, and reviewed state.
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

function makeApiResponse(checkIns: typeof UNREVIEWED_CHECK_IN[]) {
  return { checkIns, total: checkIns.length, clients: CLIENTS };
}

test.describe('Coach check-ins page — basic rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/coach/check-ins**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeApiResponse([UNREVIEWED_CHECK_IN])),
      }),
    );
    await page.goto('/user/coach/check-ins');
  });

  test('renders the Client Check-ins app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Client Check-ins');
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

  test('shows check-in card for the unreviewed client check-in', async ({ page }) => {
    // CoachCheckInCard is lazy-loaded; wait for client name to appear
    await expect(page.getByText('Alice Smith').first()).toBeVisible();
  });
});

test.describe('Coach check-ins — adding notes to a check-in', () => {
  test('saving notes calls PATCH /api/coach/check-ins/{id}/notes', async ({ page }) => {
    let patchCalled = false;
    let patchBody: Record<string, unknown> | null = null;

    await page.route('**/api/coach/check-ins**', (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'PATCH' && url.includes('/notes')) {
        patchCalled = true;
        patchBody = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ coachNotes: 'Well done this week', coachReviewedAt: new Date().toISOString() }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(makeApiResponse([UNREVIEWED_CHECK_IN])),
        });
      }
    });

    await page.goto('/user/coach/check-ins');

    // Expand the check-in card
    await page.getByText('Alice Smith').first().click();

    // Fill in coach notes
    const notesField = page.getByPlaceholder(/Leave feedback for your client/i);
    await notesField.fill('Well done this week');

    // Save Notes button should now be enabled (notes changed from null/'')
    const saveBtn = page.getByRole('button', { name: /Save Notes/i });
    await expect(saveBtn).not.toBeDisabled();
    await saveBtn.click();

    expect(patchCalled).toBe(true);
    expect(patchBody).toMatchObject({ coachNotes: 'Well done this week' });
  });
});

test.describe('Coach check-ins — reviewed state', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/coach/check-ins**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeApiResponse([REVIEWED_CHECK_IN])),
      }),
    );
    await page.goto('/user/coach/check-ins');
  });

  test('reviewed check-in card renders with client name', async ({ page }) => {
    await expect(page.getByText('Alice Smith').first()).toBeVisible();
  });

  test('reviewed check-in card shows pre-filled coach notes when expanded', async ({ page }) => {
    // Expand the card
    await page.getByText('Alice Smith').first().click();

    // The notes field should show the existing coach notes
    const notesField = page.getByPlaceholder(/Leave feedback for your client/i);
    await expect(notesField).toHaveValue('Great progress this week!');
  });

  test('Save Notes button is disabled when notes are unchanged', async ({ page }) => {
    await page.getByText('Alice Smith').first().click();
    // Button starts disabled because notes match coachNotes
    await expect(page.getByRole('button', { name: /Save Notes/i })).toBeDisabled();
  });
});

test.describe('Coach check-ins — Browse tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/coach/check-ins**', (route) =>
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
    await expect(page.getByLabel(/From/i)).toBeVisible();
    await expect(page.getByLabel(/To/i)).toBeVisible();
  });
});
