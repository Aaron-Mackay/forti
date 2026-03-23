/**
 * Library page tests (/library).
 *
 * Covers: page load with seeded assets, sidebar nav link, adding a link asset,
 * deleting an asset, and placeholder type display.
 */
import { test, expect } from './fixtures';

test.describe('Library page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/library');
  });

  test('renders the Library heading', async ({ page }) => {
    await expect(page.getByText('Library', { exact: true })).toBeVisible();
  });

  test('shows Library link in sidebar', async ({ page }) => {
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByRole('link', { name: 'Library' })).toBeVisible();
  });

  test('shows seeded coach assets from Todd', async ({ page }) => {
    // Jeff (demo user) has Todd as coach — seeded coach assets should appear
    await expect(page.getByText('From Todd')).toBeVisible();
    await expect(page.getByText('Squat Form Guide')).toBeVisible();
  });

  test('shows seeded private assets', async ({ page }) => {
    await expect(page.getByText('My Library')).toBeVisible();
    await expect(page.getByText('My PR Tracker')).toBeVisible();
  });

  test('placeholder assets show Coming soon chip', async ({ page }) => {
    // "PR Attempt — Deadlift" is a VIDEO type — should show "Coming soon"
    const videoCard = page.locator('.MuiCard-root').filter({ hasText: 'PR Attempt' }).first(); // multiple cards possible
    await expect(videoCard.getByText('Coming soon')).toBeVisible();
  });

  test('can add a new link asset', async ({ page }) => {
    await page.getByRole('button', { name: /add to library/i }).click();

    // Dialog opens
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Title').fill('Test Resource');
    await page.getByLabel('URL').fill('https://example.com/test');

    await page.getByRole('button', { name: /^add$/i }).click();

    // Dialog closes and new asset appears
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Test Resource')).toBeVisible();
  });

  test('add dialog requires title', async ({ page }) => {
    await page.getByRole('button', { name: /add to library/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Submit without filling in title
    await page.getByRole('button', { name: /^add$/i }).click();

    // Dialog stays open with validation error
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Title is required')).toBeVisible();
  });

  test('add dialog requires URL for link type', async ({ page }) => {
    await page.getByRole('button', { name: /add to library/i }).click();
    await page.getByLabel('Title').fill('No URL Link');
    // Leave URL empty, submit
    await page.getByRole('button', { name: /^add$/i }).click();

    await expect(page.getByText('URL is required for links')).toBeVisible();
  });

  test('non-link type shows Coming soon note in dialog', async ({ page }) => {
    await page.getByRole('button', { name: /add to library/i }).click();

    // Select "Document" type
    await page.getByRole('button', { name: 'Document' }).click();

    await expect(page.getByText(/coming soon/i)).toBeVisible();
    // URL field should not be visible
    await expect(page.getByLabel('URL')).not.toBeVisible();
  });

  test('can cancel the add dialog', async ({ page }) => {
    await page.getByRole('button', { name: /add to library/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('can delete an own asset', async ({ page }) => {
    // First add an asset so we have one to delete
    await page.getByRole('button', { name: /add to library/i }).click();
    await page.getByLabel('Title').fill('Delete Me');
    await page.getByLabel('URL').fill('https://example.com/delete');
    await page.getByRole('button', { name: /^add$/i }).click();
    await expect(page.getByText('Delete Me')).toBeVisible();

    // Click the delete button on this card
    const card = page.locator('.MuiCard-root').filter({ hasText: 'Delete Me' }).first(); // targeted card
    await card.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByText('Delete Me')).not.toBeVisible();
  });
});
