import { test, expect } from './fixtures';

const CHECK_INS_ROUTE = /\/api\/coach\/check-ins(?:\?.*)?$/;
const CURRENT_CHECK_IN_ROUTE = '**/api/check-in/current';
const CHECK_IN_POST_ROUTE = /\/api\/check-in$/;
const METRIC_POST_ROUTE = /\/api\/metric$/;
const PHOTO_UPLOAD_ROUTE = /\/api\/check-in\/photos$/;

function getIsoWeekStart(weeksAgo = 0): string {
  const date = new Date();
  const day = (date.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - day - (weeksAgo * 7));
  return date.toISOString();
}

async function setCoachMode(page: import('@playwright/test').Page, active: boolean) {
  await page.request.patch('/api/user/settings', {
    data: { settings: { coachModeActive: active } },
  });

  await expect.poll(async () => {
    const settingsResponse = await page.request.get('/api/user/settings');
    if (!settingsResponse.ok()) return null;
    const payload = await settingsResponse.json();
    return payload?.settings?.coachModeActive;
  }, { timeout: 10_000 }).toBe(active);
}

async function openWorkoutFlow(page: import('@playwright/test').Page) {
  await page.goto('/user/workout');

  const clickFirstPickerOrListItem = async (pickerLabel: RegExp) => {
    const picker = page.getByRole('button', { name: pickerLabel }).first();
    if (await picker.isVisible().catch(() => false)) {
      await picker.click();
      return;
    }
    await page.getByRole('listitem').first().getByRole('button').first().click();
  };

  await clickFirstPickerOrListItem(/Plan/i);
  await clickFirstPickerOrListItem(/Week/i);
  await clickFirstPickerOrListItem(/Workout/i);
}

test.describe.configure({ mode: 'serial' });
test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
  'serial: desktop chromium only');

test.describe('authentication journey', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('client logs in and can view an active plan', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Try Demo', exact: true }).click();

    await expect(page).toHaveURL('/user');
    await expect(page.getByText('Next Workout').first()).toBeVisible();
  });
});

test('client completes a workout from the workout flow', async ({ page }) => {
  let markedComplete = false;

  await page.route('**/api/workout/**', async (route) => {
    if (route.request().method() === 'PATCH') {
      markedComplete = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, dateCompleted: new Date().toISOString() }),
      });
      return;
    }
    await route.continue();
  });

  await openWorkoutFlow(page);

  const markAsComplete = page.getByRole('button', { name: 'Mark as Complete' });
  if (await markAsComplete.isVisible()) {
    await markAsComplete.click();
  } else {
    await page.getByRole('button', { name: /^Completed/ }).click();
    await page.getByRole('button', { name: 'Mark as Complete' }).click();
  }

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /Confirm|Done|Close/i }).first().click(); // modal action labels vary by viewport/theme
  expect(markedComplete).toBe(true);
});

test('client records bodyweight, macros, and steps in weekly check-in metrics', async ({ page }) => {
  const currentWeek = getIsoWeekStart(0);
  let metricCalls = 0;

  await page.route(CURRENT_CHECK_IN_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkIn: {
          id: 123,
          userId: 'test-user-id',
          weekStartDate: currentWeek,
          completedAt: null,
          energyLevel: null,
          moodRating: null,
          stressLevel: null,
          sleepQuality: null,
          recoveryRating: null,
          adherenceRating: null,
          completedWorkouts: 0,
          plannedWorkouts: 3,
          weekReview: null,
          coachMessage: null,
          goalsNextWeek: null,
          coachNotes: null,
          coachReviewedAt: null,
          frontPhotoUrl: null,
          backPhotoUrl: null,
          sidePhotoUrl: null,
          customResponses: null,
        },
        currentWeek: [],
        weekPrior: [],
        previousPhotos: null,
        weekTargets: null,
        completedWorkoutsCount: 0,
        plannedWorkoutsCount: 3,
        activePlanId: null,
        template: null,
      }),
    }),
  );

  await page.route(/\/api\/check-in\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ checkIns: [], total: 0 }),
    }),
  );

  await page.route(METRIC_POST_ROUTE, async (route) => {
    metricCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto('/user/check-in');

  const weightRow = page.locator('tr').filter({ hasText: 'Weight (kg)' }).first();
  const caloriesRow = page.locator('tr').filter({ hasText: 'Calories (kcal)' }).first();
  const proteinRow = page.locator('tr').filter({ hasText: 'Protein (g)' }).first();
  const carbsRow = page.locator('tr').filter({ hasText: 'Carbs (g)' }).first();
  const fatRow = page.locator('tr').filter({ hasText: 'Fat (g)' }).first();
  const stepsRow = page.locator('tr').filter({ hasText: 'Steps' }).first();

  await weightRow.locator('input[type="number"]').first().fill('82.4');
  await caloriesRow.locator('input[type="number"]').first().fill('2300');
  await proteinRow.locator('input[type="number"]').first().fill('180');
  await carbsRow.locator('input[type="number"]').first().fill('250');
  await fatRow.locator('input[type="number"]').first().fill('70');
  await stepsRow.locator('input[type="number"]').first().fill('10200');

  await page.waitForTimeout(700); // metric saves are debounced in the client
  expect(metricCalls).toBeGreaterThan(0);
});

test('client submits weekly check-in with photos upload mocked', async ({ page }) => {
  const currentWeek = getIsoWeekStart(0);
  let photoUploadCalled = false;
  let checkInSubmitted = false;

  await page.route(CURRENT_CHECK_IN_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkIn: {
          id: 234,
          userId: 'test-user-id',
          weekStartDate: currentWeek,
          completedAt: null,
          energyLevel: null,
          moodRating: null,
          stressLevel: null,
          sleepQuality: null,
          recoveryRating: null,
          adherenceRating: null,
          completedWorkouts: 1,
          plannedWorkouts: 3,
          weekReview: null,
          coachMessage: null,
          goalsNextWeek: null,
          coachNotes: null,
          coachReviewedAt: null,
          frontPhotoUrl: null,
          backPhotoUrl: null,
          sidePhotoUrl: null,
          customResponses: null,
        },
        currentWeek: [],
        weekPrior: [],
        previousPhotos: null,
        weekTargets: null,
        completedWorkoutsCount: 1,
        plannedWorkoutsCount: 3,
        activePlanId: null,
        template: null,
      }),
    }),
  );

  await page.route(/\/api\/check-in\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ checkIns: [], total: 0 }),
    }),
  );

  await page.route(PHOTO_UPLOAD_ROUTE, async (route) => {
    if (route.request().method() === 'POST') {
      photoUploadCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/api/check-in/photos/234/front' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route(CHECK_IN_POST_ROUTE, async (route) => {
    if (route.request().method() === 'POST') {
      checkInSubmitted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 234 }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/user/check-in');

  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'front.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake-image-data'),
  });

  await page.getByRole('button', { name: 'Save' }).first().click(); // photo crop modal save
  await expect.poll(() => photoUploadCalled).toBeTruthy();

  await page.getByRole('button', { name: /Submit Check-in/i }).click();
  expect(checkInSubmitted).toBe(true);
});

test('coach reviews a client check-in', async ({ page }) => {
  await page.route(CHECK_INS_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkIns: [{
          id: 10,
          userId: 'client-1',
          weekStartDate: '2026-03-09T00:00:00.000Z',
          completedAt: '2026-03-14T10:00:00.000Z',
          energyLevel: 4,
          moodRating: 4,
          stressLevel: 2,
          sleepQuality: 4,
          recoveryRating: 3,
          adherenceRating: 5,
          completedWorkouts: 3,
          plannedWorkouts: 4,
          weekReview: 'Solid week',
          coachMessage: null,
          goalsNextWeek: null,
          coachNotes: null,
          coachResponseUrl: null,
          coachReviewedAt: null,
          user: { id: 'client-1', name: 'Alice Smith' },
        }],
        total: 1,
        clients: [{ id: 'client-1', name: 'Alice Smith', email: 'alice@example.com' }],
      }),
    }),
  );

  await page.route(/\/api\/coach\/check-ins\/10(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkIn: {
          id: 10,
          userId: 'client-1',
          weekStartDate: '2026-03-09T00:00:00.000Z',
          completedAt: '2026-03-14T10:00:00.000Z',
          weekReview: 'Solid week',
          coachNotes: null,
          coachResponseUrl: null,
          user: { id: 'client-1', name: 'Alice Smith' },
        },
        currentWeek: [],
        weekPrior: [],
        weekTargets: null,
        activeTemplate: null,
        customMetricDefs: [],
        weekWorkouts: [],
      }),
    }),
  );

  let reviewSaved = false;
  await page.route(/\/api\/coach\/check-ins\/10\/notes(?:\?.*)?$/, async (route) => {
    reviewSaved = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ coachNotes: 'Great week.', coachReviewedAt: new Date().toISOString() }),
    });
  });

  await page.goto('/user/coach/check-ins');
  await page.getByRole('link', { name: /Alice Smith/i }).click();
  await page.getByPlaceholder(/Leave feedback for your client/i).fill('Great week.');
  await page.getByRole('button', { name: /Send Review/i }).click();

  expect(reviewSaved).toBe(true);
});

test('coach assigns a learning plan to a client', async ({ page }) => {
  await setCoachMode(page, true);

  const createPlanResponse = await page.request.post('/api/coach/learning-plans', {
    data: { title: 'Assignment Journey Plan', description: 'Assigned in E2E journey test' },
  });
  expect(createPlanResponse.ok()).toBeTruthy();

  const { plan } = await createPlanResponse.json() as { plan: { id: number } };
  const planId = plan.id;

  const clientsRes = await page.request.get('/api/coach/clients');
  expect(clientsRes.ok()).toBeTruthy();
  const clientsPayload = await clientsRes.json() as { clients: Array<{ id: string }> };

  if (clientsPayload.clients.length === 0) {
    await page.request.delete(`/api/coach/learning-plans/${planId}`);
    await setCoachMode(page, false);
    test.skip(true, 'No linked clients available in this environment for assignment flow');
  }

  const clientId = clientsPayload.clients[0].id;
  const assignRes = await page.request.post(`/api/coach/learning-plans/${planId}/assignments`, {
    data: { clientId, startDate: new Date().toISOString().slice(0, 10) },
  });
  expect(assignRes.ok()).toBeTruthy();

  await page.request.delete(`/api/coach/learning-plans/${planId}`);
  await setCoachMode(page, false);
});

test('unauthorized user cannot access another user\'s client data', async ({ page }) => {
  await setCoachMode(page, true);

  const response = await page.request.get('/api/coach/clients/not-linked-client-id/nutrition');
  expect(response.status()).toBe(403);

  await setCoachMode(page, false);
});
