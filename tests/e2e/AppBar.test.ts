import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 13'],
});

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/user/1/calendar');
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page.getByText('FortiHomeCalendarTrainingTraining Plan')).toBeVisible();
});