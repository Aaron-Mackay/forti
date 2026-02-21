/**
 * Workout page tests (/user/workout).
 *
 * Covers: plan/week/workout selection drill-down, stopwatch visibility,
 * exercise list, exercise detail view, and back navigation.
 *
 * Seed data (Bob):
 *   "Bob's Plan 1" → Week 1 → Workout 1 (Plan 1 - Week 1)
 *   Exercises include: Bench Press, Squat, Deadlift, etc.
 */
import { test, expect } from '@playwright/test';

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

    await expect(page.getByRole('button', { name: 'Start stopwatch' })).toBeVisible();
    // Seeded exercises should be visible
    await expect(page.getByRole('button', { name: 'Bench Press' })).toBeVisible();
  });

  test('selecting an exercise opens the detail view with sets', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();
    await page.getByRole('button', { name: 'Bench Press' }).click();

    // Exercise detail renders "Set 1" label
    await expect(page.getByText(/Set 1/i)).toBeVisible();
  });

  test('back button in exercise detail returns to exercises list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();
    await page.getByRole('button', { name: 'Bench Press' }).click();

    await page.getByRole('button', { name: /back/i }).click();

    // Back at exercise list level — stopwatch button is visible again
    await expect(page.getByRole('button', { name: 'Start stopwatch' })).toBeVisible();
  });

  test('back button from workout returns to workouts list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();
    await page.getByRole('button', { name: /Workout/i }).first().click();

    await page.getByRole('button', { name: /back/i }).click();

    await expect(page.getByRole('button', { name: /Workout/i }).first()).toBeVisible();
  });

  test('back button from week returns to plans list', async ({ page }) => {
    await page.getByRole('button', { name: /Plan/i }).first().click();
    await page.getByRole('button', { name: /Week/i }).first().click();

    await page.getByRole('button', { name: /back/i }).click();

    await expect(page.getByRole('button', { name: /Plan/i }).first()).toBeVisible();
  });
});
