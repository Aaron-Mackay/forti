/**
 * Feedback page tests (/user/feedback).
 *
 * Verifies the page loads without errors, renders key form elements,
 * and is reachable via the AppBar drawer link.
 */
import { test, expect } from './fixtures';

test.describe('Feedback page', () => {
  test('renders without error when navigated to directly', async ({ page }) => {
    await page.goto('/user/feedback');
    await expect(page.getByRole('heading', { name: 'Send Feedback' })).toBeVisible();
  });

  test('shows the feedback type selector', async ({ page }) => {
    await page.goto('/user/feedback');
    await expect(page.getByLabel('Type')).toBeVisible();
  });

  test('shows the description field and submit button', async ({ page }) => {
    await page.goto('/user/feedback');
    await expect(page.getByLabel('Description')).toBeVisible();
    await expect(page.getByRole('button', { name: /Submit Feedback/i })).toBeVisible();
  });

  test('drawer Feedback link navigates to the feedback page', async ({ page }) => {
    await page.goto('/user');
    await page.getByRole('button', { name: /menu/i }).click();
    await page.getByRole('link', { name: /Feedback/i }).click();
    await expect(page).toHaveURL('/user/feedback');
    await expect(page.getByRole('heading', { name: 'Send Feedback' })).toBeVisible();
  });
});
