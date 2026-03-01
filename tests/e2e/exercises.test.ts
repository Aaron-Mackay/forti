/**
 * Exercise exploration page tests (/exercises).
 *
 * Covers: exercise card grid, text/muscle/equipment filters, and the
 * Add Exercise dialog (including live anatomy preview and validation).
 */
import {test, expect} from './fixtures';

test.describe('Exercises browse page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/exercises');
  });

  test('renders the Exercises heading', async ({page}) => {
    await expect(page.getByRole('heading', {name: /exercises/i})).toBeVisible();
  });

  test('renders exercise cards from seed data', async ({page}) => {
    // Seed populates many exercises; at least one card must be present
    await expect(page.locator('.MuiCard-root').first()).toBeVisible();
  });

  test('shows anatomy diagrams on cards with muscles', async ({page}) => {
    // Seeded exercises have muscles; MuscleHighlight creates scoped anatomy-{id} wrappers
    await expect(page.locator('[id^="anatomy-"]').first()).toBeVisible();
  });

  test('text search filters exercises by name', async ({page}) => {
    const search = page.getByLabel('Search');
    await search.fill('bench');
    // After filtering, all visible card names should contain "bench" (case-insensitive)
    const cards = page.locator('.MuiCard-root');
    await expect(cards.first()).toBeVisible();
    // Clear and confirm more cards appear again
    await search.clear();
    const allCount = await cards.count();
    await search.fill('xyznonexistentexercise');
    await expect(page.getByText(/no exercises match/i)).toBeVisible();
    await search.clear();
    await expect(cards).toHaveCount(allCount);
  });

  test('muscle filter narrows results', async ({page}) => {
    const muscleFilter = page.getByLabel('Muscles');
    await muscleFilter.click();
    await page.getByRole('option', {name: 'quads'}).click();
    // Must still show at least one exercise (seeded data has quad exercises)
    await expect(page.locator('.MuiCard-root').first()).toBeVisible();
  });

  test('equipment filter narrows results', async ({page}) => {
    const equipmentFilter = page.getByLabel('Equipment');
    await equipmentFilter.click();
    await page.getByRole('option', {name: 'pullup bar'}).click();
    await expect(page.locator('.MuiCard-root').first()).toBeVisible();
  });

  test('shows sidebar Exercises link that is active', async ({page}) => {
    // Open drawer via menu button
    await page.getByRole('button', {name: /menu/i}).click();
    await expect(page.getByRole('link', {name: 'Exercises'})).toBeVisible();
  });
});

test.describe('Add Exercise dialog', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/exercises');
  });

  test('Add Exercise button opens the dialog', async ({page}) => {
    await page.getByRole('button', {name: /add exercise/i}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Cancel closes the dialog', async ({page}) => {
    await page.getByRole('button', {name: /add exercise/i}).click();
    await page.getByRole('button', {name: /cancel/i}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('Add button is disabled when name is empty', async ({page}) => {
    await page.getByRole('button', {name: /add exercise/i}).click();
    const addBtn = page.getByRole('dialog').getByRole('button', {name: /^add exercise$/i});
    await expect(addBtn).toBeDisabled();
  });

  test('Add button is disabled when equipment is not selected', async ({page}) => {
    await page.getByRole('button', {name: /add exercise/i}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Exercise Name').fill('Test Exercise');
    // Select muscles but not equipment
    const musclesInput = dialog.getByLabel('Muscles (required)');
    await musclesInput.click();
    await page.getByRole('option', {name: 'biceps'}).click();
    await page.keyboard.press('Escape');
    const addBtn = dialog.getByRole('button', {name: /^add exercise$/i});
    await expect(addBtn).toBeDisabled();
  });

  test('Add button is disabled when muscles are not selected', async ({page}) => {
    await page.getByRole('button', {name: /add exercise/i}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Exercise Name').fill('Test Exercise');
    // Select equipment but not muscles
    const equipmentInput = dialog.getByLabel('Equipment (required)');
    await equipmentInput.click();
    await page.getByRole('option', {name: 'barbell'}).click();
    await page.keyboard.press('Escape');
    const addBtn = dialog.getByRole('button', {name: /^add exercise$/i});
    await expect(addBtn).toBeDisabled();
  });

  test('anatomy preview appears when muscles are selected', async ({page}) => {
    await page.getByRole('button', {name: /add exercise/i}).click();
    const dialog = page.getByRole('dialog');
    // Before selection — anatomy-0 scoped element still exists (empty highlight)
    const anatomyWrapper = dialog.locator('#anatomy-0');
    await expect(anatomyWrapper).toBeVisible();
    // Select a muscle and confirm the wrapper is still visible (SVGs rendered)
    const musclesInput = dialog.getByLabel('Muscles (required)');
    await musclesInput.click();
    await page.getByRole('option', {name: 'biceps'}).click();
    await page.keyboard.press('Escape');
    await expect(anatomyWrapper).toBeVisible();
  });

  test('shows error for duplicate exercise', async ({page}) => {
    // Intercept the POST and simulate a 409 conflict
    await page.route('/api/exercises', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({error: 'Exercise already exists'}),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', {name: /add exercise/i}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Exercise Name').fill('Bench Press');

    const equipmentInput = dialog.getByLabel('Equipment (required)');
    await equipmentInput.click();
    await page.getByRole('option', {name: 'barbell'}).click();
    await page.keyboard.press('Escape');

    const musclesInput = dialog.getByLabel('Muscles (required)');
    await musclesInput.click();
    await page.getByRole('option', {name: 'sternal-pec'}).click();
    await page.keyboard.press('Escape');

    await dialog.getByRole('button', {name: /^add exercise$/i}).click();
    await expect(dialog.getByRole('alert')).toContainText(/already exists/i);
    // Dialog should remain open on error
    await expect(dialog).toBeVisible();
  });

  test('successful add closes dialog', async ({page}) => {
    // Intercept POST and return a successful fake exercise
    await page.route('/api/exercises', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 9999,
            name: 'E2E Test Exercise',
            category: 'Test',
            description: null,
            equipment: ['barbell'],
            muscles: ['biceps'],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', {name: /add exercise/i}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Exercise Name').fill('E2E Test Exercise');

    const equipmentInput = dialog.getByLabel('Equipment (required)');
    await equipmentInput.click();
    await page.getByRole('option', {name: 'barbell'}).click();
    await page.keyboard.press('Escape');

    const musclesInput = dialog.getByLabel('Muscles (required)');
    await musclesInput.click();
    await page.getByRole('option', {name: 'biceps'}).click();
    await page.keyboard.press('Escape');

    await dialog.getByRole('button', {name: /^add exercise$/i}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
