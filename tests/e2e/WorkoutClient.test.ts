/**
 * Workout page tests (/user/workout).
 *
 * Covers: plan/week/workout selection drill-down, stopwatch visibility,
 * exercise list, exercise detail view, back navigation, and previous set data.
 *
 * Seed data (Bob):
 *   "Bob's Plan 1" → Week 1 → Workout 1 (Plan 1 - Week 1)
 *   Exercises include: Bench Press, Squat, Deadlift, etc.
 */
import { test, expect } from './fixtures';

test.describe('Workout page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/user/workout');
  });

  test('renders the Training app bar title', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('Training');
  });

  test('shows the plans list on first load', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Plan/i }).first()).toBeVisible();
  });

  test('selecting a plan reveals the weeks list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await expect(page.getByRole('button', { name: /Week/i }).first()).toBeVisible();
  });

  test('selecting a week reveals the workouts list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();
    await expect(page.getByRole('button', { name: /Workout/i }).first()).toBeVisible();
  });

  test('selecting a workout reveals the stopwatch and exercise list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();

    await expect(page.getByRole('button', { name: /start stopwatch|stop stopwatch/i })).toBeVisible();
    // Seeded exercises should be visible
    await expect(page.getByRole('button', { name: 'Squat' })).toBeVisible();
  });

  test('selecting an exercise opens the detail view with sets', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();
    await page.getByRole('button', { name: 'Squat' }).click();

    // Exercise detail renders "Set 1" label
    await expect(page.getByText('Set').first()).toBeVisible();
  });

  test('exercise detail shows anatomy diagram for exercises with muscles', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();
    await page.getByRole('button', { name: 'Squat' }).click();

    await expect(page.getByText('Set').first()).toBeVisible();
    await expect(page.locator('[id^="anatomy-"]').first()).toBeVisible();
  });

  test('back button in exercise detail returns to exercises list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();
    await page.getByRole('button', { name: 'Squat' }).click();

    await page.getByRole('button', { name: /back/i }).click();

    // Back at exercise list level — stopwatch button is visible again
    await expect(page.getByRole('button', { name: /start stopwatch|stop stopwatch/i })).toBeVisible();
  });

  test('back button from workout returns to workouts list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
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

      await page.getByRole('button', { name: /Plan/i }).first().click();
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
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('[id^="anatomy-"]').first()).toBeVisible();
    });

    test('completion modal closes when the X button is clicked', async ({ page }) => {
      await page.getByRole('button', { name: 'Mark as Complete' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test('back button from week returns to plans list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();

    await page.getByRole('button', { name: /back/i }).click();
    await page.getByRole('button', { name: /back/i }).click();

    await expect(page.getByRole('button', { name: /Plan/i }).first()).toBeVisible();
  });

  test.describe('e1rm display in exercise detail', () => {
    test('shows Est. 1RM when weight and reps are entered', async ({page}) => {
      // Stub e1rm-history so the sparkline resolves immediately (no history)
      await page.route('**/api/exercises/*/e1rm-history**', route =>
        route.fulfill({status: 200, contentType: 'application/json', body: '[]'}),
      );

      await page.getByRole('button', {name: /Plan/i}).first().click();
      await page.getByRole('button', {name: /Week/i}).first().click();
      await page.getByRole('button', {name: /Workout/i}).first().click();
      await page.getByRole('button', {name: 'Squat'}).click();
      await expect(page.getByText('Set').first()).toBeVisible();

      // Scope to active slide — all slides render in DOM simultaneously
      const activeSlide = page.locator('.swiper-slide-active');
      await activeSlide.getByLabel('Weight').first().fill('100');
      await activeSlide.getByLabel('Reps').first().fill('5');

      // Epley: 100 * (1 + 5/30) = 116.7 — shown in disabled Est. 1RM field
      await expect(activeSlide.getByLabel('Est. 1RM').first()).toHaveValue('116.7');
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

      await page.getByRole('button', {name: /Plan/i}).first().click();
      await page.getByRole('button', {name: /Week/i}).first().click();
      await page.getByRole('button', {name: /Workout/i}).first().click();
      await page.getByRole('button', {name: 'Squat'}).click();
      await expect(page.getByText('Set').first()).toBeVisible();

      // Scope to active slide — all slides render in DOM simultaneously
      const activeSlide = page.locator('.swiper-slide-active');
      await expect(activeSlide.getByText('Est. 1RM history')).toBeVisible();
      await expect(activeSlide.getByText(/Personal Best: 200\.0/)).toBeVisible();
    });
  });

  test.describe('cardio exercise in workout', () => {
    test('shows cardio summary chip for a cardio exercise with logged data', async ({ page }) => {
      await page.getByRole('button', { name: /Plan/i }).first().click();
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

      await page.getByRole('button', { name: /Plan/i }).first().click();
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

      await page.getByRole('button', { name: /Plan/i }).first().click();
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

      await page.getByRole('button', { name: /Plan/i }).first().click();
      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Treadmill' }).click();

      const activeSlide = page.locator('.swiper-slide-active');
      await expect(activeSlide.getByText(/Last session: 25 min · 4 km/)).toBeVisible();
    });
  });

  test.describe('add exercise config dialog', () => {
    test.beforeEach(async ({page}) => {
      await page.getByRole('button', {name: /Plan/i}).first().click();
      await page.getByRole('button', {name: /Week/i}).first().click();
      await page.getByRole('button', {name: /Workout/i}).first().click();
      await expect(page.getByRole('button', {name: 'Squat'})).toBeVisible();
    });

    test('selecting an exercise from picker opens the config dialog', async ({page}) => {
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await expect(page.getByRole('dialog', {name: 'Add Exercise'})).toBeVisible();
      await page.getByRole('listitem').filter({hasText: 'Squat'}).first().click();
      await expect(page.getByRole('dialog', {name: /Configure Exercise/i})).toBeVisible();
    });

    test('config dialog shows Sets, Rep Range and Rest Time controls', async ({page}) => {
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await page.getByRole('listitem').filter({hasText: 'Squat'}).first().click();
      const dialog = page.getByRole('dialog', {name: /Configure Exercise/i});
      await expect(dialog.getByText('Sets')).toBeVisible();
      await expect(dialog.getByLabel('Rep range')).toBeVisible();
      await expect(dialog.getByLabel('Rest time')).toBeVisible();
    });

    test('cancelling config dialog closes it without adding', async ({page}) => {
      const exerciseCount = await page.getByRole('listitem').count();
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await page.getByRole('listitem').filter({hasText: 'Squat'}).first().click();
      await page.getByRole('button', {name: 'Cancel'}).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(page.getByRole('listitem')).toHaveCount(exerciseCount);
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
              exerciseId: 1,
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
              exercise: {id: 1, name: 'Squat', category: 'resistance', description: null, equipment: [], primaryMuscles: [], secondaryMuscles: []},
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await page.getByRole('listitem').filter({hasText: 'Squat'}).first().click();
      await page.getByRole('button', {name: 'Add'}).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('remove added exercise', () => {
    test('remove button is visible for isAdded exercises and removes the exercise on click', async ({page}) => {
      await page.route('**/api/workoutExercise', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 9999,
              workoutId: 1,
              exerciseId: 1,
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
              exercise: {id: 1, name: 'Leg Press', category: 'resistance', description: null, equipment: [], primaryMuscles: [], secondaryMuscles: []},
            }),
          });
        } else {
          await route.continue();
        }
      });
      await page.route('**/api/workoutExercise/9999', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({status: 204});
        } else {
          await route.continue();
        }
      });

      await page.getByRole('button', {name: /Plan/i}).first().click();
      await page.getByRole('button', {name: /Week/i}).first().click();
      await page.getByRole('button', {name: /Workout/i}).first().click();
      await expect(page.getByRole('button', {name: 'Squat'})).toBeVisible();

      // Add exercise via the two-step flow
      await page.getByRole('button', {name: 'Add Exercise'}).click();
      await page.getByRole('listitem').filter({hasText: 'Squat'}).first().click();
      await page.getByRole('button', {name: 'Add'}).click();

      // The added exercise should now appear with a remove button
      await expect(page.getByRole('button', {name: 'Remove exercise'})).toBeVisible();

      // Click remove
      await page.getByRole('button', {name: 'Remove exercise'}).click();

      // The remove button should be gone
      await expect(page.getByRole('button', {name: 'Remove exercise'})).not.toBeVisible();
    });
  });

  test.describe('previous set data in exercise detail', () => {
    test('displays previous weight and reps below each matching set', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-sets**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { order: 1, weight: 65, reps: 10 },
            { order: 2, weight: 70, reps: 8 },
          ]),
        });
      });

      await page.getByRole('button', { name: /Plan/i }).first().click();
      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByText('Set').first()).toBeVisible();

      const activeSlide = page.locator('.swiper-slide-active');
      await expect(activeSlide.getByText('Prev: 65 × 10')).toBeVisible();
      await expect(activeSlide.getByText('Prev: 70 × 8')).toBeVisible();
    });

    test('shows em dash for null weight or reps in previous set', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-sets**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { order: 1, weight: null, reps: 10 },
            { order: 2, weight: 65, reps: null },
          ]),
        });
      });

      await page.getByRole('button', { name: /Plan/i }).first().click();
      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByText('Set').first()).toBeVisible();

      const activeSlide = page.locator('.swiper-slide-active');
      await expect(activeSlide.getByText('Prev: — × 10')).toBeVisible();
      await expect(activeSlide.getByText('Prev: 65 × —')).toBeVisible();
    });

    test('shows no previous data when the API returns an empty array', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-sets**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.getByRole('button', { name: /Plan/i }).first().click();
      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByText('Set').first()).toBeVisible();

      // aria-label="Previous: ..." is only set when actual previous data exists — absent when API returns []
      await expect(page.locator('[aria-label^="Previous:"]')).toHaveCount(0);
    });
  });
});
