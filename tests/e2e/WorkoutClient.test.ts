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

    await expect(page.getByRole('button', { name: 'Toggle stopwatch' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Toggle stopwatch' })).toBeVisible();
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

  test.describe('previous set data in exercise detail', () => {
    test('displays previous weight and reps below each matching set', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-sets**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { order: 1, weight: '65', reps: 10 },
            { order: 2, weight: '70', reps: 8 },
          ]),
        });
      });

      await page.getByRole('button', { name: /Plan/i }).first().click();
      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByText('Set').first()).toBeVisible();

      await expect(page.getByText('Last: 65 × 10')).toBeVisible();
      await expect(page.getByText('Last: 70 × 8')).toBeVisible();
    });

    test('shows em dash for null weight or reps in previous set', async ({ page }) => {
      await page.route('**/api/exercises/*/previous-sets**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { order: 1, weight: null, reps: 10 },
            { order: 2, weight: '65', reps: null },
          ]),
        });
      });

      await page.getByRole('button', { name: /Plan/i }).first().click();
      await page.getByRole('button', { name: /Week/i }).first().click();
      await page.getByRole('button', { name: /Workout/i }).first().click();
      await page.getByRole('button', { name: 'Squat' }).click();
      await expect(page.getByText('Set').first()).toBeVisible();

      await expect(page.getByText('Last: — × 10')).toBeVisible();
      await expect(page.getByText('Last: 65 × —')).toBeVisible();
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

      await expect(page.getByText(/^Last:/)).not.toBeVisible();
    });
  });
});
