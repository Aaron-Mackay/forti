/**
 * Calendar page tests (/user/calendar).
 *
 * Covers: page load, FullCalendar rendering, date selection, event/block FABs,
 * creating a new custom event, and the bottom drawer interactions.
 */
import {expect, test} from './fixtures';

test.describe('Calendar page', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/user/calendar');
  });

  test('renders the Calendar app bar title', async ({page}) => {
    await expect(page.getByRole('banner')).toContainText('Calendar');
  });

  test('displays the FullCalendar grid', async ({page}) => {
    // FullCalendar renders a table-like grid with day cells
    await expect(page.locator('.fc-multimonth')).toBeVisible({timeout: 10_000});
  });

  test('shows Today, prev and next navigation buttons', async ({page}) => {
    await expect(page.getByRole('button', {name: 'Today'})).toBeVisible();
    await expect(page.locator('.fc-prev-button')).toBeVisible();
    await expect(page.locator('.fc-next-button')).toBeVisible();
  });

  test('shows the Events FAB (seeded custom events exist)', async ({page}) => {
    await expect(page.getByRole('button', {name: 'Events'})).toBeVisible({timeout: 10_000});
  });

  test('shows the Blocks FAB (seeded block events exist)', async ({page}) => {
    await expect(page.getByRole('button', {name: 'Blocks'})).toBeVisible({timeout: 10_000});
  });

  test('shows the add (+) FAB', async ({page}) => {
    await expect(page.getByRole('button', {name: 'add'})).toBeVisible();
  });

  test('clicking the add FAB opens the event creation form', async ({page}) => {
    await page.getByRole('button', {name: 'add'}).click();
    // The bottom drawer should open and show the event form
    await page.screenshot({path: 'test.png'});
    await expect(page.getByText(/^Event$/i)).toBeVisible({timeout: 5_000});
  });

  test('clicking a day cell opens the bottom drawer with day details', async ({page}) => {
    // Click on any visible day cell
    const dayCell = page.locator('.fc-day-future').first();
    await dayCell.click();
    // The bottom drawer opens with a date heading or events list
    await expect(page.locator('.MuiDrawer-paperAnchorBottom')).toBeVisible({timeout: 5_000});
  });

  test('clicking the Blocks FAB opens the blocks list', async ({page}) => {
    await page.getByRole('button', {name: 'Blocks'}).click();
    // Blocks right-drawer should appear
    await expect(page.getByRole('dialog')).toBeVisible({timeout: 5_000});
  });

  test('clicking the Events FAB opens the events list', async ({page}) => {
    await page.getByRole('button', {name: 'Events'}).click();
    await expect(page.getByRole('dialog')).toBeVisible({timeout: 5_000});
  });

  test('Today button navigates the calendar to the current month', async ({page}) => {
    // Go forward, then back to today
    await page.locator('.fc-next-button').click();
    await page.getByRole('button', {name: 'Today'}).click();
    // The current year should be visible in the calendar header title
    const currentYear = new Date().getFullYear().toString();
    await expect(page.locator('.fc-toolbar-title')).toContainText(currentYear);
  });
});
