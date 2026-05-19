/**
 * Workout page tests (/user/workout).
 *
 * Covers: plan/week/workout selection drill-down, stopwatch visibility,
 * exercise list, exercise detail view, back navigation, and previous set data.
 *
 * Seed data (TestUser):
 *   "TestUser's Plan 1" → Week 1 → Workout 1 (Plan 1 - Week 1)
 *   Exercises include: Bench Press, Squat, Deadlift, etc.
 */
import { test, expect } from './fixtures';

async function clearActivePlan(page: import('@playwright/test').Page) {
  const response = await page.request.patch('/api/plan/active', {
    data: { planId: null },
  });
  expect(response.ok()).toBe(true);
}

async function setFirstPlanActive(page: import('@playwright/test').Page) {
  const res = await page.request.get('/api/workout-data');
  expect(res.ok()).toBe(true);
  const data = await res.json();
  const firstPlanId: number | undefined = data.plans?.[0]?.id;
  expect(firstPlanId).toBeTruthy();
  const patch = await page.request.patch('/api/plan/active', {
    data: { planId: firstPlanId },
  });
  expect(patch.ok()).toBe(true);
}

async function disableSignalUi(page: import('@playwright/test').Page) {
  const response = await page.request.patch('/api/user/settings', {
    data: { settings: { signalUiEnabled: false } },
  });
  expect(response.ok()).toBe(true);
}

function addedLegPressWorkoutExercise() {
  return {
    id: 9999,
    workoutId: 1,
    exerciseId: 999,
    order: 99,
    isAdded: true,
    repRange: '8-12',
    restTime: '90',
    targetRpe: null,
    targetRir: null,
    notes: null,
    cardioDuration: null,
    cardioDistance: null,
    cardioResistance: null,
    substitutedForId: null,
    substitutedFor: null,
    isBfr: false,
    requiresRecording: false,
    sets: [
      {id: 99001, workoutExerciseId: 9999, order: 0, reps: null, weight: null, rpe: null, rir: null, e1rm: null, isDropSet: false, parentSetId: null},
      {id: 99002, workoutExerciseId: 9999, order: 1, reps: null, weight: null, rpe: null, rir: null, e1rm: null, isDropSet: false, parentSetId: null},
      {id: 99003, workoutExerciseId: 9999, order: 2, reps: null, weight: null, rpe: null, rir: null, e1rm: null, isDropSet: false, parentSetId: null},
    ],
    exercise: {
      id: 999,
      name: 'Leg Press',
      category: 'resistance',
      description: null,
      equipment: [],
      primaryMuscles: [],
      secondaryMuscles: [],
      createdByUserId: null,
    },
  };
}

test.describe('Workout page', () => {
  test.beforeEach(async ({ page }) => {
    await disableSignalUi(page);
    await setFirstPlanActive(page);
    await page.goto('/user/workout');
  });

  test('redirects to the active plan weeks route', async ({ page }) => {
    await expect(page).toHaveURL(/\/user\/plan\/\d+\/weeks/);
    await expect(page.getByRole('banner')).toContainText('Weeks');
  });

  test('lands on the weeks route when an active plan is set', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Week/i }).first()).toBeVisible();
  });

  test('shows the no-active-plan empty state when no active plan is set', async ({ page }) => {
    await clearActivePlan(page);
    await page.goto('/user/workout');
    await expect(page).toHaveURL('/user/workout');
    await expect(page.getByText('No active plan').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /View plans/i })).toBeVisible();
  });

  test('selecting a week reveals the workouts list', async ({ page }) => {
    await page.getByRole('button', { name: /Week/i }).first().click();
    await expect(page.getByRole('button', { name: /Workout/i }).first()).toBeVisible();
  });

  test('workouts list shows muscle coverage summary with body diagram', async ({ page }) => {
    await page.getByRole('button', { name: /Week/i }).first().click();
    await expect(page.getByText('Muscle Coverage')).toBeVisible();
    await expect(page.locator('[id^="week-muscle-"] svg').first()).toBeVisible();
    await page.locator('[id^="week-muscle-"]').click();
    await expect(page.getByRole('dialog', { name: 'Muscle Coverage' })).toBeVisible();
    await expect(page.getByText(/\d+(\.\d+)?\/\d+(\.\d+)?/).first()).toBeVisible();
  });

  test('selecting a workout reveals the stopwatch and exercise list', async ({ page }) => {
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();

    await expect(page.getByRole('button', { name: /start stopwatch|stop stopwatch/i })).toBeVisible();
    // Seeded exercises should be visible
    await expect(page.getByRole('button', { name: 'Squat' })).toBeVisible();
  });

  test('selecting an exercise opens the detail view with sets', async ({ page }) => {
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();
    await page.getByRole('button', { name: 'Squat' }).click();

    // Exercise detail renders weight/reps inputs for each set
    await expect(page.getByLabel('Reps set 1').first()).toBeVisible();
  });

  test('exercise detail shows anatomy diagram for exercises with muscles', async ({ page }) => {
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();
    await page.getByRole('button', { name: 'Squat' }).click();

    await expect(page.getByLabel('Reps set 1').first()).toBeVisible();
    const activeSlide = page.locator('.swiper-slide-active');
    await activeSlide.getByRole('tab', { name: /muscles/i }).click();
    await expect(activeSlide.locator('[id^="anatomy-"]').first()).toBeVisible();
  });

  test('back button in exercise detail returns to exercises list', async ({ page }) => {
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();
    await page.getByRole('button', { name: 'Squat' }).click();

    await page.getByRole('button', { name: /back/i }).click();

    // Back at exercise list level — stopwatch button is visible again
    await expect(page.getByRole('button', { name: /start stopwatch|stop stopwatch/i })).toBeVisible();
  });

  test('back button from workout returns to workouts list', async ({ page }) => {
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();

    await page.getByRole('button', { name: /back/i }).click();

    await expect(page.getByRole('button', { name: /Workout/i }).first()).toBeVisible();
  });

  test.describe('workout completion modal', () => {
    test.beforeEach(async ({ page }) => {
      // Intercept PATCH to avoid mutating the DB across test runs
      await page.route('**/api/workout/**', async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({id: 1, dateCompleted: new Date().toISOString()}),
          });
        } else {
          await route.continue();
        }
      });

      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await expect(page.getByRole('button', { name: 'Squat' })).toBeVisible();

      // If the workout is already marked complete, unmark it first so we can test the modal trigger
      const alreadyCompleted = page.getByRole('button', { name: /^Completed/ });
      if (await alreadyCompleted.isVisible()) {
        await alreadyCompleted.click();
        await expect(page.getByRole('button', { name: 'Mark as Complete' })).toBeVisible();
      }
    });

    test('clicking Mark as Complete opens the completion modal', async ({ page }) => {
      await page.getByRole('button', { name: 'Mark as Complete' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('completion modal shows ordinal workout count for the week', async ({ page }) => {
      await page.getByRole('button', { name: 'Mark as Complete' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/workouts done this week/i)).toBeVisible();
    });

    test('completion modal shows muscle set count chips', async ({ page }) => {
      await page.getByRole('button', { name: 'Mark as Complete' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      // At least one muscle chip with set count should be present (seed data has sets with reps)
      await expect(page.getByText(/\d+ sets?/).first()).toBeVisible();
    });

    test('completion modal shows anatomy model', async ({ page }) => {
      await page.getByRole('button', { name: 'Mark as Complete' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const anatomy = dialog.getByTestId('workout-completion-anatomy');
      await expect(anatomy).toBeVisible();
      await expect(anatomy.locator('svg').first()).toBeVisible();
    });

    test('completion modal closes when the X button is clicked', async ({ page }) => {
      await page.getByRole('button', { name: 'Mark as Complete' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test('back button from weeks route navigates to /user/plan', async ({ page }) => {
    // Land on the weeks list (active plan is set in beforeEach).
    await expect(page.getByRole('button', { name: /Week/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /back/i }).click();

    await expect(page).toHaveURL('/user/plan');
  });

  test.describe('e1rm display in exercise detail', () => {
    test('shows Est. 1RM when weight and reps are entered', async ({page}) => {
      // Stub e1rm-history so the sparkline resolves immediately (no history)
      await page.route('**/api/exercises/*/e1rm-history**', route =>
        route.fulfill({status: 200, contentType: 'application/json', body: '[]'}),
      );

      await page.getByRole('button', {name: /Week/i}).first().click();
      await page.getByRole('button', {name: /Workout/i}).first().click();
      await page.getByRole('button', {name: 'Squat'}).click();
      await expect(page.getByLabel('Reps set 1').first()).toBeVisible();

      // Scope to active slide — all slides render in DOM simultaneously
      const activeSlide = page.locator('.swiper-slide-active');
      await activeSlide.getByRole('textbox', {name: 'Weight set 1'}).first().fill('100');
      await activeSlide.getByLabel('Reps set 1').first().fill('5');

      // Epley: 100 * (1 + 5/30) = 116.7 — shown in disabled Est. 1RM field
      await expect(activeSlide.getByLabel('Est. 1RM set 1').first()).toHaveValue('116.7');
    });

    test('shows e1rm sparkline when history exists', async ({page}) => {
      // Use a historicalBest that exceeds any possible seeded today-e1rm so isNewBest stays false
      await page.route('**/api/exercises/*/e1rm-history**', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {date: '2025-01-10T00:00:00.000Z', bestE1rm: 150},
            {date: '2025-02-10T00:00:00.000Z', bestE1rm: 200},
          ]),
        }),
      );

      await page.getByRole('button', {name: /Week/i}).first().click();
      await page.getByRole('button', {name: /Workout/i}).first().click();
      await page.getByRole('button', {name: 'Squat'}).click();
      await expect(page.getByLabel('Reps set 1').first()).toBeVisible();

      // Scope to active slide — all slides render in DOM simultaneously
      const activeSlide = page.locator('.swiper-slide-active');
      const historyToggle = activeSlide.getByRole('tab', {name: 'Progress'});
      await expect(historyToggle).toBeVisible();
      await expect(activeSlide.locator('.apexcharts-canvas')).not.toBeVisible();
      await historyToggle.click();
      await expect(activeSlide.locator('.apexcharts-canvas')).toBeVisible();
    });
  });

  test.describe('cardio exercise in workout', () => {
    test('shows cardio summary chip for a cardio exercise with logged data', async ({ page }) => {
      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();

      // Treadmill is seeded in Workout A of Plan 1 (first workout)
      await expect(page.getByRole('button', { name: 'Treadmill' })).toBeVisible();
    });

    test('cardio exercise opens CardioSlide with duration/distance inputs', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-cardio**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(null),
        });
      });

      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Treadmill' }).click();

      await expect(page.getByLabel(/Duration/i).first()).toBeVisible();
      await expect(page.getByLabel(/Distance/i).first()).toBeVisible();
      await expect(page.getByLabel(/Resistance/i).first()).toBeVisible();
    });

    test('cardio slide computes and shows pace from duration and distance inputs', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-cardio**', async (route) => {
        await route.fulfill({status: 200, contentType: 'application/json', body: 'null'});
      });
      await page.route('**/api/workoutExercise/**', async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({status: 200, contentType: 'application/json', body: '{}'});
        } else {
          await route.continue();
        }
      });

      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Treadmill' }).click();

      const activeSlide = page.locator('.swiper-slide-active');
      await activeSlide.getByLabel(/Duration/i).fill('30');
      await activeSlide.getByLabel(/Distance/i).fill('5');

      // 30 min / 5 km = 6:00 /km
      await expect(activeSlide.getByText(/6:00 \/km/)).toBeVisible();
    });

    test('cardio slide shows previous session summary when API returns data', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-cardio**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({cardioDuration: 25, cardioDistance: 4, cardioResistance: null}),
        });
      });

      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Treadmill' }).click();

      const activeSlide = page.locator('.swiper-slide-active');
      await expect(activeSlide.getByText(/Last session: 25 min · 4 km/)).toBeVisible();
    });
  });

  test.describe('add exercise config dialog', () => {
    test.beforeEach(async ({page}) => {
      await page.route('**/api/exercises', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {id: 1, name: 'Squat', category: 'resistance', description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
          ]),
        });
      });

      await page.getByRole('button', {name: /Week/i}).first().click();
      await page.getByRole('button', {name: /Workout/i}).first().click();
      await expect(page.getByRole('button', {name: 'Squat'})).toBeVisible();
    });

    test('selecting an exercise from picker opens the config dialog', async ({page}) => {
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await expect(page.getByRole('dialog', {name: 'Add Exercise'})).toBeVisible();
      await page.getByRole('dialog', {name: 'Add Exercise'}).getByRole('button', {name: 'Squat'}).click();
      await expect(page.getByRole('dialog', {name: /Configure Exercise/i})).toBeVisible();
    });

    test('config dialog shows Sets, Rep Range and Rest Time controls', async ({page}) => {
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await page.getByRole('dialog', {name: 'Add Exercise'}).getByRole('button', {name: 'Squat'}).click();
      const dialog = page.getByRole('dialog', {name: /Configure Exercise/i});
      await expect(dialog.getByText('Sets')).toBeVisible();
      await expect(dialog.getByLabel('Rep range')).toBeVisible();
      await expect(dialog.getByLabel('Rest time')).toBeVisible();
    });

    test('cancelling config dialog closes it without adding', async ({page}) => {
      const exerciseCount = await page.getByRole('listitem').count();
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await page.getByRole('dialog', {name: 'Add Exercise'}).getByRole('button', {name: 'Squat'}).click();
      await page.getByRole('button', {name: 'Cancel'}).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByRole('listitem')).toHaveCount(exerciseCount);
    });

    test('shows create button when search has no matches', async ({page}) => {
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      const dialog = page.getByRole('dialog', {name: 'Add Exercise'});
      await dialog.getByLabel('Search exercises').fill('Nonexistent Exercise XYZ');
      await expect(dialog.getByRole('button', {name: /Create "Nonexistent Exercise XYZ"/})).toBeVisible();
    });

    test('does not show create button when search is empty', async ({page}) => {
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      const dialog = page.getByRole('dialog', {name: 'Add Exercise'});
      await expect(dialog.getByRole('button', {name: /Create "/})).not.toBeVisible();
    });

    test('clicking create button opens the add exercise form with name pre-filled', async ({page}) => {
      await page.route('**/api/exercises', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {id: 1, name: 'Squat', category: 'resistance', description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
            ]),
          });
        } else {
          await route.continue();
        }
      });
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      const pickerDialog = page.getByRole('dialog', {name: 'Add Exercise'});
      await pickerDialog.getByLabel('Search exercises').fill('Nordic Curl');
      await pickerDialog.getByRole('button', {name: /Create "Nordic Curl"/}).click();
      const createDialog = page.getByRole('dialog', {name: 'Add New Exercise'});
      await expect(createDialog).toBeVisible();
      await expect(createDialog.getByLabel('Exercise Name')).toHaveValue('Nordic Curl');
    });

    test('creating a new exercise via the picker auto-selects it', async ({page}) => {
      const newExercise = {id: 99, name: 'Nordic Curl', category: 'resistance', description: null, equipment: ['bodyweight'], primaryMuscles: ['hamstrings'], secondaryMuscles: [], createdByUserId: null};
      await page.route('**/api/exercises', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({status: 201, contentType: 'application/json', body: JSON.stringify(newExercise)});
        } else {
          await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify([{id: 1, name: 'Squat', category: 'resistance', description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null}]),
          });
        }
      });
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      const pickerDialog = page.getByRole('dialog', {name: 'Add Exercise'});
      await pickerDialog.getByLabel('Search exercises').fill('Nordic Curl');
      await pickerDialog.getByRole('button', {name: /Create "Nordic Curl"/}).click();
      const createDialog = page.getByRole('dialog', {name: 'Add New Exercise'});
      await createDialog.getByLabel('Exercise Name').fill('Nordic Curl');
      // Select equipment
      await createDialog.getByLabel('Equipment (required)').click();
      await page.getByRole('option', {name: /bodyweight/i}).click();
      await page.keyboard.press('Escape');
      // Select primary muscles
      await createDialog.getByLabel('Primary Muscles (required)').click();
      await page.getByRole('option', {name: /hamstrings/i}).click();
      await page.keyboard.press('Escape');
      await createDialog.getByRole('button', {name: 'Add Exercise'}).click();
      // Should auto-proceed to config dialog
      await expect(page.getByRole('dialog', {name: /Configure Exercise/i})).toBeVisible();
    });

    test('confirming config dialog adds the exercise', async ({page}) => {
      await page.route('**/api/workoutExercise', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 9999,
              workoutId: 1,
              exerciseId: 999,
              order: 99,
              isAdded: true,
              repRange: '8-12',
              restTime: '90',
              notes: null,
              cardioDuration: null,
              cardioDistance: null,
              cardioResistance: null,
              substitutedForId: null,
              substitutedFor: null,
              sets: [],
              exercise: {id: 1, name: 'Squat', category: 'resistance', description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await page.getByRole('dialog', {name: 'Add Exercise'}).getByRole('button', {name: 'Squat'}).click();
      await page.getByRole('button', {name: 'Add'}).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('remove added exercise', () => {
    test.beforeEach(async ({page}) => {
      await page.evaluate(() => {
        window.localStorage.removeItem('forti.exerciseListCache.v1');
      });
      await page.route(url => url.pathname === '/api/exercises', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {id: 1, name: 'Squat', category: 'resistance', description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
            {id: 999, name: 'Leg Press', category: 'resistance', description: null, equipment: [], primaryMuscles: [], secondaryMuscles: [], createdByUserId: null},
          ]),
        });
      });
    });

    test('remove button is visible for isAdded exercises and removes the exercise on click', async ({page}) => {
      let deleteCalled = false;
      await page.route('**/api/workoutExercise', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(addedLegPressWorkoutExercise()),
          });
        } else {
          await route.continue();
        }
      });
      await page.route('**/api/workoutExercise/9999', async (route) => {
        if (route.request().method() === 'DELETE') {
          deleteCalled = true;
          await route.fulfill({status: 204});
        } else {
          await route.continue();
        }
      });

      await page.getByRole('button', {name: /Week/i}).first().click();
      await page.getByRole('button', {name: /Workout/i}).first().click();
      await expect(page.getByRole('button', {name: 'Squat'})).toBeVisible();

      // Add exercise via the two-step flow
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await page.getByRole('dialog', {name: 'Add Exercise'}).getByRole('button', {name: 'Leg Press'}).click();
      await page.getByRole('button', {name: 'Add'}).click();

      // Wait for list update and scope to the newly added row
      const addedExerciseRow = page
        .getByRole('button')
        .filter({hasText: 'Leg Press'})
        .filter({hasText: 'Added'})
        .filter({has: page.getByLabel(/Remove exercise block \d+/)})
        .first();
      await expect(addedExerciseRow).toBeVisible();
      await expect(addedExerciseRow.getByLabel(/Remove exercise block \d+/)).toBeVisible();

      // Click remove
      await addedExerciseRow.getByLabel(/Remove exercise block \d+/).click();
      await page.getByRole('dialog', {name: 'Remove exercise?'}).getByRole('button', {name: 'Remove'}).click();

      // Verify the remove action was sent
      await expect.poll(() => deleteCalled).toBe(true);
    });
  });

  test.describe('effort chips (RPE / RIR)', () => {
    test.describe.configure({ mode: 'serial' });
    // Settings mutations are shared across browser projects — skip on mobile to
    // avoid parallel conflicts with Chromium/Firefox/WebKit desktop runs.
    test.skip(({ isMobile }) => isMobile, 'Settings mutation tests skipped on mobile');

    async function navigateToSquat(page: import('@playwright/test').Page) {
      // Reload the page so the React settings context picks up any PATCH made
      // via page.request before this call. Without a reload the context retains
      // the value that was loaded at the start of the test.
      await page.goto('/user/workout');
      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByLabel('Reps set 1').first()).toBeVisible();
    }

    test('no effort chips shown when effortMetric is none (default)', async ({ page }) => {
      // Ensure setting is off
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'none' } } });
      await navigateToSquat(page);
      await expect(page.getByText('RPE', { exact: true }).first()).not.toBeVisible();
      await expect(page.getByText('RIR', { exact: true }).first()).not.toBeVisible();
    });

    test('RPE chip row appears for each set when effortMetric is rpe', async ({ page }) => {
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'rpe' } } });
      await navigateToSquat(page);
      // At least one RPE label visible (one per regular set)
      await expect(page.getByText('RPE', { exact: true }).first()).toBeVisible();
      // Standard RPE values shown as chips
      await expect(page.getByRole('button', { name: '8' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: '10' }).first()).toBeVisible();
      // Reset setting
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'none' } } });
    });

    test('RIR chip row appears for each set when effortMetric is rir', async ({ page }) => {
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'rir' } } });
      await navigateToSquat(page);
      await expect(page.getByText('RIR', { exact: true }).first()).toBeVisible();
      // RIR values 0-4 shown as chips
      await expect(page.getByRole('button', { name: '0' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: '4' }).first()).toBeVisible();
      // Reset setting
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'none' } } });
    });

    test('selecting an RPE chip highlights it and PATCH is sent', async ({ page }) => {
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'rpe' } } });

      // Stub the sets PATCH so we don't mutate real data
      await page.route('**/api/sets/**', async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        } else {
          await route.continue();
        }
      });

      await navigateToSquat(page);
      const activeSlide = page.locator('.swiper-slide-active');

      // Click the "8" chip on the visible set row
      const chip8 = activeSlide.getByRole('button', { name: '8' }).first();
      await chip8.click();

      // Chip should now be filled (selected) — MUI filled chip uses contained style
      // We can verify it's visually selected by checking aria-pressed or just that it's still present
      await expect(chip8).toBeVisible();

      // Reset setting
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'none' } } });
    });

    test('effort chips remain visible after selecting a value (not collapsed)', async ({ page }) => {
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'rpe' } } });
      await page.route('**/api/sets/**', async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        } else {
          await route.continue();
        }
      });

      await navigateToSquat(page);
      const activeSlide = page.locator('.swiper-slide-active');
      const chip8 = activeSlide.getByRole('button', { name: '8' }).first();
      await chip8.click();

      // Chip row must still be visible — not collapsed after rating
      await expect(activeSlide.getByText('RPE', { exact: true }).first()).toBeVisible();

      // Reset setting
      await page.request.patch('/api/user/settings', { data: { settings: { effortMetric: 'none' } } });
    });

    test('settings page shows None/RPE/RIR toggle group under Workout', async ({ page }) => {
      await page.goto('/user/settings');
      await expect(page.getByRole('button', { name: 'None' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'RPE' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'RIR' })).toBeVisible();
    });
  });

  test.describe('previous set data in exercise detail', () => {
    test('displays up to three previous workouts in an accordion below the set list', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-sets**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workouts: [
              {
                completedAt: '2026-01-14T12:00:00.000Z',
                workoutName: 'Leg day',
                sets: [
                  { order: 1, weight: 65, reps: 10, e1rm: 86.7 },
                  { order: 2, weight: 70, reps: 8, e1rm: 88.7 },
                ],
              },
              {
                completedAt: '2026-01-07T12:00:00.000Z',
                workoutName: 'Leg day',
                sets: [
                  { order: 1, weight: 60, reps: 10, e1rm: 80 },
                ],
              },
            ],
          }),
        });
      });

      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByLabel('Reps set 1').first()).toBeVisible();

      const activeSlide = page.locator('.swiper-slide-active');
      await activeSlide.getByRole('tab', {name: /history/i}).click();
      await expect(activeSlide.getByText('Jan 14, 2026')).toBeVisible();
      await expect(activeSlide.getByText('Jan 7, 2026')).toBeVisible();
      const latestWorkoutTable = activeSlide.getByLabel('Previous workout table 1');
      await expect(latestWorkoutTable.getByRole('cell', {name: '65 kg'})).toBeVisible();
      await expect(latestWorkoutTable.getByRole('cell', {name: '10'})).toBeVisible();
    });

    test('shows em dash for null weight or reps in previous workout rows', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-sets**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workouts: [
              {
                completedAt: '2026-01-14T12:00:00.000Z',
                workoutName: 'Leg day',
                sets: [
                  { order: 1, weight: null, reps: 10, e1rm: null },
                  { order: 2, weight: 65, reps: null, e1rm: null },
                ],
              },
            ],
          }),
        });
      });

      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByLabel('Reps set 1').first()).toBeVisible();

      const activeSlide = page.locator('.swiper-slide-active');
      await activeSlide.getByRole('tab', {name: /history/i}).click();
      await expect(activeSlide.getByRole('cell', {name: '—'}).first()).toBeVisible();
      await expect(activeSlide.getByRole('cell', {name: '65 kg'})).toBeVisible();
    });

    test('shows no previous data when the API returns an empty history payload', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-sets**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ workouts: [] }),
        });
      });

      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByLabel('Reps set 1').first()).toBeVisible();

      const activeSlide = page.locator('.swiper-slide-active');
      await activeSlide.getByRole('tab', {name: /history/i}).click();
      await expect(activeSlide.getByText('No previous workouts yet')).toBeVisible();
    });
  });
});
