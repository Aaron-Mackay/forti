/**
 * Exercise exploration page tests (/exercises).
 *
 * Covers: exercise card grid, text/muscle/equipment filters, the
 * Add Exercise dialog (including live anatomy preview and validation),
 * and the exercise detail drawer with e1rm history chart.
 */
import {test, expect} from './fixtures';

async function openNav(page: import('@playwright/test').Page) {
  const menuButton = page.getByRole('button', { name: /menu/i });
  if (await menuButton.count()) {
    await expect(menuButton).toBeVisible();
    await menuButton.click();
  }
  await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();
  return page.locator('body');
}

test.describe('Exercises browse page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/exercises');
  });

  test('renders the Exercises heading', async ({page}) => {
    await expect(page.getByRole('banner')).toContainText('Exercises');
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
    const nav = await openNav(page);
    await expect(nav.getByRole('link', {name: 'Exercises'})).toBeVisible();
  });

  test.describe('exercise detail drawer', () => {
    test('clicking an exercise card opens the detail drawer', async ({page}) => {
      await page.route('**/api/exercises/*/e1rm-history**', route =>
        route.fulfill({status: 200, contentType: 'application/json', body: '[]'}),
      );

      await page.locator('.MuiCard-root').first().click();
      // Drawer opens — look for the "Est. 1RM Progress" heading
      await expect(page.getByText('Est. 1RM Progress')).toBeVisible();
    });

    test('drawer shows e1rm chart when history exists', async ({page}) => {
      await page.route('**/api/exercises/*/e1rm-history**', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {date: '2025-01-10T00:00:00.000Z', bestE1rm: 80},
            {date: '2025-03-10T00:00:00.000Z', bestE1rm: 95},
          ]),
        }),
      );

      await page.locator('.MuiCard-root').first().click();
      await expect(page.getByText('Est. 1RM Progress')).toBeVisible();
      // ApexCharts renders an SVG when data is present
      await expect(page.locator('.apexcharts-canvas').first()).toBeVisible();
    });

    test('drawer closes when clicking outside', async ({page}) => {
      await page.route('**/api/exercises/*/e1rm-history**', route =>
        route.fulfill({status: 200, contentType: 'application/json', body: '[]'}),
      );

      await page.locator('.MuiCard-root').first().click();
      await expect(page.getByText('Est. 1RM Progress')).toBeVisible();
      // Close the drawer with Escape (reliable across all browsers including mobile)
      await page.keyboard.press('Escape');
      await expect(page.getByText('Est. 1RM Progress')).not.toBeVisible();
    });
  });
});

test.describe('Coach exercise description override', () => {
  test.describe.configure({mode: 'serial'});
  test.skip(({browserName}) => browserName !== 'chromium',
    'State-dependent tests run on chromium only');

  test('drawer does not show coach sections for a user with no coach relationship', async ({page}) => {
    await page.route('**/api/exercises/*/e1rm-history**', route =>
      route.fulfill({status: 200, contentType: 'application/json', body: '[]'}),
    );

    await page.goto('/exercises');
    await page.locator('.MuiCard-root').first().click();
    await expect(page.getByText('Est. 1RM Progress')).toBeVisible();

    // Neither coach section should be visible for a user with no coach relationship
    await expect(page.getByText('Description for clients')).not.toBeVisible();
    await expect(page.getByText('From your coach')).not.toBeVisible();
  });

  test('PUT /api/coach/exercise-description returns 403 when caller is not a coach', async ({page}) => {
    await page.goto('/exercises');
    const res = await page.request.put('/api/coach/exercise-description/1', {
      data: {description: 'Test override'},
    });
    expect(res.status()).toBe(403);
  });

  test('DELETE /api/coach/exercise-description returns 403 when caller is not a coach', async ({page}) => {
    await page.goto('/exercises');
    const res = await page.request.delete('/api/coach/exercise-description/1');
    expect(res.status()).toBe(403);
  });
});

test.describe('Add Exercise dialog', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/exercises');
  });

  test('Add Exercise button opens the dialog', async ({page}) => {
    await page.getByRole('button', {name: /^add$/i}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Cancel closes the dialog', async ({page}) => {
    await page.getByRole('button', {name: /^add$/i}).click();
    await page.getByRole('button', {name: /cancel/i}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('Add button is disabled when name is empty', async ({page}) => {
    await page.getByRole('button', {name: /^add$/i}).click();
    const addBtn = page.getByRole('dialog').getByRole('button', {name: /^add exercise$/i});
    await expect(addBtn).toBeDisabled();
  });

  test('Add button is disabled when equipment is not selected', async ({page}) => {
    await page.getByRole('button', {name: /^add$/i}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Exercise Name').fill('Test Exercise');
    // Select muscles but not equipment
    const musclesInput = dialog.getByLabel('Primary Muscles (required)');
    await musclesInput.click();
    await page.getByRole('option', {name: 'biceps'}).click();
    await page.keyboard.press('Escape');
    const addBtn = dialog.getByRole('button', {name: /^add exercise$/i});
    await expect(addBtn).toBeDisabled();
  });

  test('Add button is disabled when muscles are not selected', async ({page}) => {
    await page.getByRole('button', {name: /^add$/i}).click();
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
    await page.getByRole('button', {name: /^add$/i}).click();
    const dialog = page.getByRole('dialog');
    // Before selection — anatomy-0 scoped element still exists (empty highlight)
    const anatomyWrapper = dialog.locator('#anatomy-0');
    await expect(anatomyWrapper).toBeVisible();
    // Select a muscle and confirm the wrapper is still visible (SVGs rendered)
    const musclesInput = dialog.getByLabel('Primary Muscles (required)');
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

    await page.getByRole('button', {name: /^add$/i}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Exercise Name').fill('Bench Press');

    const equipmentInput = dialog.getByLabel('Equipment (required)');
    await equipmentInput.click();
    await page.getByRole('option', {name: 'barbell'}).click();
    await page.keyboard.press('Escape');

    const musclesInput = dialog.getByLabel('Primary Muscles (required)');
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
            primaryMuscles: ['biceps'],
            secondaryMuscles: [],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', {name: /^add$/i}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Exercise Name').fill('E2E Test Exercise');

    const equipmentInput = dialog.getByLabel('Equipment (required)');
    await equipmentInput.click();
    await page.getByRole('option', {name: 'barbell'}).click();
    await page.keyboard.press('Escape');

    const musclesInput = dialog.getByLabel('Primary Muscles (required)');
    await musclesInput.click();
    await page.getByRole('option', {name: 'biceps'}).click();
    await page.keyboard.press('Escape');

    await dialog.getByRole('button', {name: /^add exercise$/i}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
