import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 13'],
});

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/user/1/workout');
  await page.getByRole('button', { name: 'Plan 1 - Aaron\'s Plan 1' }).click();
  await page.getByRole('button', { name: 'Week 1' }).click();
  await page.getByRole('button', { name: 'Workout 1 (Plan 1 - Week 1)' }).click();
  await expect(page.getByRole('button', { name: 'Start stopwatch' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bench Press' })).toBeVisible();
  await page.getByRole('button', { name: 'Bench Press' }).click();
  await expect(page.getByText('123')).toBeVisible();
  await expect(page.getByText('Set 1WeightWeightRepsReps').first()).toBeVisible();
});