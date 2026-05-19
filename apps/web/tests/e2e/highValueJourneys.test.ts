import { test, expect } from './fixtures';

const CHECK_INS_ROUTE = /\/api\/coach\/check-ins(?:\?.*)?$/;
const CURRENT_CHECK_IN_ROUTE = '**/api/check-in/current';
const CHECK_IN_POST_ROUTE = /\/api\/check-in$/;
const METRIC_POST_ROUTE = /\/api\/metric$/;
const PHOTO_UPLOAD_ROUTE = /\/api\/check-in\/photos\/?(?:\?.*)?$/;

function getIsoWeekStart(weeksAgo = 0): string {
  const date = new Date();
  const day = (date.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - day - (weeksAgo * 7));
  return date.toISOString();
}

async function setCoachMode(page: import('@playwright/test').Page, active: boolean) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.request.post('/api/coach/activate', {
      data: { active },
    });

    const applied = await expect.poll(async () => {
      const settingsResponse = await page.request.get('/api/user/settings');
      if (!settingsResponse.ok()) return null;
      const payload = await settingsResponse.json();
      return payload?.settings?.coachModeActive;
    }, { timeout: 10_000 }).toBe(active).then(() => true).catch(() => false);

    if (applied) return;
    await page.waitForTimeout(300);
  }

  throw new Error(`Failed to apply coach mode state: ${active}`);
}

async function setFirstPlanActive(page: import('@playwright/test').Page) {
  const res = await page.request.get('/api/workout-data');
  if (!res.ok()) return;
  const data = await res.json();
  const firstPlanId: number | undefined = data.plans?.[0]?.id;
  if (firstPlanId) {
    await page.request.patch('/api/plan/active', { data: { planId: firstPlanId } });
  }
}

async function openWorkoutFlow(page: import('@playwright/test').Page): Promise<boolean> {
  await setFirstPlanActive(page);
  await page.goto('/user/workout');
  const content = page.locator('main');
  const markAsComplete = content.getByRole('button', { name: 'Mark as Complete' });
  const completedButton = content.getByRole('button', { name: /^Completed/ });

  if (!(await markAsComplete.isVisible()) && !(await completedButton.isVisible())) {
    const weekButton = content.getByRole('button', { name: /Week/i }).first();
    if (await weekButton.isVisible()) {
      await weekButton.click();
    }
    const workoutButton = content.getByRole('button', { name: /Workout/i }).first();
    if (await workoutButton.isVisible()) {
      await workoutButton.click();
    }
  }

  return markAsComplete.or(completedButton).isVisible();
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
      const body = route.request().postDataJSON();
      markedComplete = !!body.dateCompleted;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, dateCompleted: body.dateCompleted || null }),
      });
      return;
    }
    await route.continue();
  });

  const hasCompletionAction = await openWorkoutFlow(page);
  test.skip(!hasCompletionAction, 'No workout completion action available in current seeded state');

  const content = page.locator('main');
  const markAsComplete = content.getByRole('button', { name: 'Mark as Complete' });
  const completedButton = content.getByRole('button', { name: /^Completed/ });
  await expect(markAsComplete.or(completedButton)).toBeVisible();

  if (await markAsComplete.isVisible()) {
    await markAsComplete.click();
  } else {
    // If already completed, uncomplete it first so we can test the completion flow
    await completedButton.click();
    // Wait for the button to transition back to 'Mark as Complete'
    await expect(markAsComplete).toBeVisible();
    await markAsComplete.click();
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
          coachResponseUrl: null,
          frontPhotoUrl: null,
          backPhotoUrl: null,
          sidePhotoUrl: null,
          customResponses: null,
          templateSnapshot: null,
        },
        currentWeek: [],
        weekPrior: [],
        previousPhotos: null,
        weekTargets: null,
        completedWorkoutsCount: 0,
        plannedWorkoutsCount: 3,
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

  await page.route(METRIC_POST_ROUTE, async (route) => {
    metricCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto('/user/check-in');

  const toggleBreakdown = page.getByRole('button', { name: 'Toggle daily breakdown' }).first();
  await expect(toggleBreakdown).toBeVisible({ timeout: 15_000 });
  await toggleBreakdown.click();

  const summaryTable = page.getByTestId('summary-table');
  const breakdownTable = page.getByTestId('breakdown-table');

  const getInputForMetric = async (metricName: RegExp) => {
    const labelRows = summaryTable.locator('tr');

    const rowCount = await labelRows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = labelRows.nth(i);

      if (await row.filter({ hasText: metricName }).count()) {
        return breakdownTable
          .locator('tr')
          .nth(i)
          .locator('input[type="number"]')
          .first();
      }
    }

    throw new Error(`Could not find metric row: ${metricName}`);
  };

  const weightInput = await getInputForMetric(/Weight \(kg\)/i);
  const caloriesInput = await getInputForMetric(/Calories/i);
  const proteinInput = await getInputForMetric(/Protein \(g\)/i);
  const carbsInput = await getInputForMetric(/Carbs \(g\)/i);
  const fatInput = await getInputForMetric(/Fat \(g\)/i);
  const stepsInput = await getInputForMetric(/Steps/i);

  await expect(weightInput).toBeVisible({ timeout: 15_000 });

  await weightInput.fill('82.4');
  await caloriesInput.fill('2300');
  await proteinInput.fill('180');
  await carbsInput.fill('250');
  await fatInput.fill('70');
  await stepsInput.fill('10200');

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
          coachResponseUrl: null,
          frontPhotoUrl: null,
          backPhotoUrl: null,
          sidePhotoUrl: null,
          customResponses: null,
          templateSnapshot: null,
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
        body: JSON.stringify({
          checkIn: {
            id: 234,
            userId: 'test-user-id',
            weekStartDate: currentWeek,
            completedAt: new Date().toISOString(),
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
            coachResponseUrl: null,
            frontPhotoUrl: null,
            backPhotoUrl: null,
            sidePhotoUrl: null,
            customResponses: null,
            templateSnapshot: null,
          },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/user/check-in');

  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W4x0AAAAASUVORK5CYII=',
    'base64',
  );
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'front.png',
    mimeType: 'image/png',
    buffer: tinyPng,
  });

  const photoDialog = page.getByRole('dialog').first();
  await expect(photoDialog).toBeVisible();
  await expect(photoDialog.getByText(/Adjust - Front Photo/i)).toBeVisible();
  await expect(photoDialog.getByRole('progressbar')).toBeHidden();
  await photoDialog.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => photoUploadCalled).toBeTruthy();

  await page.getByRole('button', { name: /Submit Check-in/i }).click();
  expect(checkInSubmitted).toBe(true);
});

test('coach reviews a client check-in', async ({ page }) => {
  await setCoachMode(page, true);

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
          customResponses: null,
          templateSnapshot: null,
          frontPhotoUrl: null,
          backPhotoUrl: null,
          sidePhotoUrl: null,
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
          customResponses: null,
          templateSnapshot: null,
          frontPhotoUrl: null,
          backPhotoUrl: null,
          sidePhotoUrl: null,
          user: { id: 'client-1', name: 'Alice Smith' },
        },
        currentWeek: [],
        weekPrior: [],
        weekTargets: null,
        activeTemplate: null,
        customMetricDefs: [],
        workoutSummaries: [],
        activePlanId: null,
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
  await expect(page.getByRole('link', { name: /Alice Smith/i })).toBeVisible();
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
  expect([403, 404]).toContain(response.status());

  await setCoachMode(page, false);
});
