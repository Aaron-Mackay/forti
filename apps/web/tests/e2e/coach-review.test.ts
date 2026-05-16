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
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

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
  customResponses: null,
  templateSnapshot: null,
  frontPhotoUrl: null,
  sidePhotoUrl: null,
  backPhotoUrl: null,
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

async function signInAsDemoCoach(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Try Demo (Coach)' }).click();
  await expect(page).toHaveURL('/user');
}

async function signInAsLegacyCoach(page: Page) {
  await signInAsDemoCoach(page);
  await page.request.patch('/api/user/settings', {
    data: { settings: { coachModeActive: true, signalUiEnabled: false } },
  });
  await expect.poll(async () => {
    const response = await page.request.get('/api/user/settings');
    const payload = await response.json() as { settings?: { signalUiEnabled?: boolean } };
    return payload.settings?.signalUiEnabled;
  }, { timeout: 10_000 }).toBe(false);
}

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
    workoutSummaries: [],
    activePlanId: null,
  };
}

test.describe('Coach check-ins page — basic rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsLegacyCoach(page);
    await page.route(CHECK_INS_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeApiResponse([UNREVIEWED_CHECK_IN])),
      }),
    );
    await page.goto('/user/coach/check-ins');
  });

  test('renders the tabs, badge, and unreviewed client row', async ({ page }) => {
    await expect(page.getByRole('tablist')).toBeVisible();
    await expect(page.getByRole('tab', { name: /New/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Browse/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /New/i })
      .locator('.MuiChip-root')).toContainText('1');
    await expect(page.getByText('Alice Smith').first()).toBeVisible();
  });
});

test.describe('Coach check-ins — dedicated review page', () => {
  test('clicking a list item opens the dedicated check-in review page', async ({ page }) => {
    await signInAsLegacyCoach(page);
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
    await signInAsLegacyCoach(page);
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

  test('shows Loom embed preview immediately from the review link input', async ({ page }) => {
    await signInAsLegacyCoach(page);
    await page.route(CHECK_IN_10_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeDetailApiResponse(UNREVIEWED_CHECK_IN)),
      }),
    );
    await page.route(CHECK_IN_10_NOTES_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checkIn: { id: 10 } }),
      }),
    );

    await page.goto('/user/coach/check-ins/10');
    await page.getByLabel(/Review link/i).fill('https://www.loom.com/share/abc123DEF');

    const loomFrame = page.locator('iframe[title="Coach Loom review"]');
    await expect(loomFrame).toBeVisible();
    await expect(loomFrame).toHaveAttribute('src', 'https://www.loom.com/embed/abc123DEF');
  });

  test('does not show Loom embed preview for non-Loom links', async ({ page }) => {
    await signInAsLegacyCoach(page);
    await page.route(CHECK_IN_10_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeDetailApiResponse(UNREVIEWED_CHECK_IN)),
      }),
    );

    await page.goto('/user/coach/check-ins/10');
    await page.getByLabel(/Review link/i).fill('https://example.com/review');

    await expect(page.locator('iframe[title="Coach Loom review"]')).toHaveCount(0);
  });
});

test.describe('Coach check-ins — reviewed state', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsLegacyCoach(page);
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

test.describe('Coach check-ins — Signal review surface', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: { cookies: [], origins: [] } });
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal review layout coverage runs on desktop chromium only; settings state is shared');

  test.beforeEach(async ({ page }) => {
    await signInAsLegacyCoach(page);
    await page.request.patch('/api/user/settings', {
      data: { settings: { coachModeActive: true, signalUiEnabled: true } },
    });
    await expect.poll(async () => {
      const response = await page.request.get('/api/user/settings');
      const payload = await response.json() as { settings?: { signalUiEnabled?: boolean } };
      return payload.settings?.signalUiEnabled;
    }, { timeout: 10_000 }).toBe(true);
    await page.route(CHECK_IN_10_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeDetailApiResponse(UNREVIEWED_CHECK_IN)),
      }),
    );
  });

  test('flagged check-in review shows the Signal calm review composition', async ({ page }) => {
    await page.goto('/user/coach/check-ins/10');
    const main = page.getByRole('main');

    await expect(main.getByText('Client check-in').first()).toBeVisible();
    await expect(main.getByText('Coach response').first()).toBeVisible();
    await expect(main.getByText('Week targets').first()).toBeVisible();
    await expect(main.getByText('Support').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Open current plan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send review/i })).toBeVisible();
  });
});

test.describe('Coach check-ins — Signal list surface', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: { cookies: [], origins: [] } });
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Signal check-in list coverage runs on desktop chromium only; demo-coach state is shared');

  test.beforeEach(async ({ page }) => {
    await signInAsLegacyCoach(page);
    await page.request.patch('/api/user/settings', {
      data: { settings: { coachModeActive: true, signalUiEnabled: true } },
    });
    await expect.poll(async () => {
      const response = await page.request.get('/api/user/settings');
      const payload = await response.json() as { settings?: { signalUiEnabled?: boolean } };
      return payload.settings?.signalUiEnabled;
    }, { timeout: 10_000 }).toBe(true);
    await page.route(CHECK_INS_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeApiResponse([UNREVIEWED_CHECK_IN])),
      }),
    );
  });

  test('flagged check-in list shows the Signal planning desk', async ({ page }) => {
    await page.goto('/user/coach/check-ins');

    const main = page.getByRole('main');

    await expect(page.locator('[data-signal-surface="planning"]').first()).toBeVisible();
    await expect(main.getByText('Check-ins desk')).toBeVisible();
    await expect(main.getByText('Coach Check-ins')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Needs review/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Browse archive/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure template' })).toBeVisible();
    await expect(page.getByText('Alice Smith').first()).toBeVisible();
  });
});

test.describe('Coach check-ins — progress photo compare', () => {
  const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9ZL5UusAAAAASUVORK5CYII=';

  const CHECK_IN_WITH_PHOTOS = {
    ...UNREVIEWED_CHECK_IN,
    frontPhotoUrl: PIXEL,
    sidePhotoUrl: PIXEL,
    backPhotoUrl: PIXEL,
  };

  const PHOTO_HISTORY_ROUTE = /\/api\/coach\/check-ins\/10\/photo-history(?:\?.*)?$/;

  test.beforeEach(async ({ page }) => {
    await signInAsLegacyCoach(page);
    await page.route(CHECK_IN_10_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeDetailApiResponse(CHECK_IN_WITH_PHOTOS)),
      }),
    );
  });

  test('renders side-by-side comparison with empty state when no prior history', async ({ page }) => {
    await page.route(PHOTO_HISTORY_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entries: [] }),
      }),
    );

    await page.goto('/user/coach/check-ins/10');

    await expect(page.getByText(/progress photos/i).first()).toBeVisible();
    await expect(page.getByText('This week').first()).toBeVisible();
    await expect(page.getByText('Compare with').first()).toBeVisible();
    await expect(page.getByText('No earlier photos yet').first()).toBeVisible();
  });

  test('renders comparison week selector and switches photos when changed', async ({ page }) => {
    await page.route(PHOTO_HISTORY_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            { id: 9, weekStartDate: '2026-03-02T00:00:00.000Z', frontPhotoUrl: PIXEL, sidePhotoUrl: PIXEL, backPhotoUrl: null },
            { id: 8, weekStartDate: '2026-02-23T00:00:00.000Z', frontPhotoUrl: PIXEL, sidePhotoUrl: null, backPhotoUrl: null },
          ],
        }),
      }),
    );

    await page.goto('/user/coach/check-ins/10');

    const select = page.getByRole('combobox');
    await expect(select).toBeVisible();
    await expect(select).toContainText('Week of 2 Mar 2026');

    await select.click();
    await expect(page.getByRole('option', { name: /Week of 2 Mar 2026/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Week of 23 Feb 2026/ })).toBeVisible();

    await page.getByRole('option', { name: /Week of 23 Feb 2026/ }).click();
    await expect(select).toContainText('Week of 23 Feb 2026');
  });

  test('clicking a tile opens the dialog with keyboard week navigation', async ({ page }) => {
    await page.route(PHOTO_HISTORY_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            { id: 9, weekStartDate: '2026-03-02T00:00:00.000Z', frontPhotoUrl: PIXEL, sidePhotoUrl: PIXEL, backPhotoUrl: PIXEL },
          ],
        }),
      }),
    );

    await page.goto('/user/coach/check-ins/10');

    await page.getByRole('button', { name: /Front progress photo, week of 9 Mar 2026/ }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const prevBtn = dialog.getByRole('button', { name: 'Previous week' });
    await expect(prevBtn).toBeEnabled();
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.getByRole('img', { name: /front photo, week of 2 Mar 2026/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Next week' })).toBeEnabled();
  });
});

test.describe('Coach check-ins — Browse tab', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemoCoach(page);
    await page.route(CHECK_INS_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeApiResponse([])),
      }),
    );
    await page.goto('/user/coach/check-ins');
  });

  test('Browse tab shows filter controls and date fields', async ({ page }) => {
    await page.getByRole('tab', { name: /Browse/i }).click();
    await expect(page.getByRole('button', { name: /Search/i })).toBeVisible();
    await expect(page.locator('input[type="date"]').nth(0)).toBeVisible();
    await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
  });
});
