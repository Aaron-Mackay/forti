/**
 * Feedback page tests (/user/feedback).
 *
 * Verifies the page loads without errors, renders key form elements,
 * and is reachable via the AppBar drawer link.
 */
import { test, expect } from './fixtures';

async function openNav(page: import('@playwright/test').Page) {
  const homeLink = page.getByRole('link', { name: 'Home' }).first();
  const homeAlreadyVisible = await homeLink.waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true).catch(() => false);
  if (homeAlreadyVisible) return;
  await page.getByRole('button', { name: /menu/i }).first().click({ timeout: 10_000 });
  await expect(homeLink).toBeVisible({ timeout: 15_000 });
}

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
    await openNav(page);
    await page.getByRole('link', { name: /Feedback/i }).click();
    await expect(page).toHaveURL('/user/feedback');
    await expect(page.getByRole('heading', { name: 'Send Feedback' })).toBeVisible();
  });
});
