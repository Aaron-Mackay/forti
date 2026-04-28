/**
 * Calendar page tests (/user/calendar).
 *
 * Covers: page load, FullCalendar rendering, date selection, event/block FABs,
 * creating a new custom event, bottom drawer interactions, and the week list
 * view (toggle, month headers, current-week highlight, navigation back to
 * calendar).
 *
 * Strict-mode notes (see fixtures.ts for the full guide):
 *   - `.fc-day-future` matches every future day cell — always narrow with
 *     .first().
 *   - Week list text patterns (W\d+) match every week row — always narrow with
 *     .first().
 *   - MuiDrawer dialog: only one right-drawer opens at a time, but use
 *     .first() defensively since MUI may render additional dialog nodes.
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
    await expect(page.getByText(/^Event$/i)).toBeVisible({timeout: 5_000});
    await expect(page.getByRole('button', {name: 'Back'})).toHaveCount(0);
  });

  test('clicking a day cell opens the bottom drawer with day details', async ({page}) => {
    // .fc-day-future matches every future day — narrow with .first()
    await page.locator('.fc-day-future').first().click();
    await expect(page.locator('.MuiDrawer-paperAnchorBottom')).toBeVisible({timeout: 5_000});
  });

  test('clicking the Blocks FAB opens the blocks list', async ({page}) => {
    await page.getByRole('button', {name: 'Blocks'}).click();
    // Use .first() — MUI Drawer may render multiple nodes with role="dialog"
    await expect(page.getByRole('dialog').first()).toBeVisible({timeout: 5_000});
  });

  test('clicking the Events FAB opens the events list', async ({page}) => {
    await page.getByRole('button', {name: 'Events'}).click();
    await expect(page.getByRole('dialog').first()).toBeVisible({timeout: 5_000});
  });

  test('Today button navigates the calendar to the current month', async ({page}) => {
    await page.locator('.fc-next-button').click();
    await page.getByRole('button', {name: 'Today'}).click();
    const currentYear = new Date().getFullYear().toString();
    await expect(page.locator('.fc-toolbar-title')).toContainText(currentYear);
  });
});

test.describe('Calendar — view toggle', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/user/calendar');
  });

  test('shows Calendar and Weeks toggle buttons', async ({page}) => {
    await expect(page.getByRole('button', {name: 'Calendar'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Weeks'})).toBeVisible();
  });

  test('Calendar toggle is selected by default', async ({page}) => {
    await expect(page.getByRole('button', {name: 'Calendar'})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', {name: 'Weeks'})).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking Weeks hides the FullCalendar grid', async ({page}) => {
    await page.getByRole('button', {name: 'Weeks'}).click();
    await expect(page.locator('.fc-multimonth')).not.toBeVisible();
  });

  test('clicking Weeks shows a scrollable week list', async ({page}) => {
    await page.getByRole('button', {name: 'Weeks'}).click();
    // Each week card starts with "W{n} ·" — narrow to first to avoid strict mode
    await expect(page.getByText(/W\d+ ·/).first()).toBeVisible({timeout: 5_000});
  });

  test('week list highlights the current week', async ({page}) => {
    await page.getByRole('button', {name: 'Weeks'}).click();
    await expect(page.getByText('This week')).toBeVisible({timeout: 5_000});
  });

  test('week list shows a month header for the current year', async ({page}) => {
    await page.getByRole('button', {name: 'Weeks'}).click();
    const currentYear = new Date().getFullYear().toString();
    // Month headers are "MONTH YYYY" e.g. "MARCH 2026" — require letters before the
    // year so we don't match the hidden FullCalendar toolbar title which is just "2026"
    await expect(page.getByText(new RegExp(`[A-Z]+ ${currentYear}`)).first()).toBeVisible({timeout: 5_000});
  });

  test('clicking a week card switches back to calendar view', async ({page}) => {
    await page.getByRole('button', {name: 'Weeks'}).click();
    // Click the first week card row (narrow with .first())
    await page.getByText(/W\d+ ·/).first().click();
    // FullCalendar should be visible again
    await expect(page.locator('.fc-multimonth')).toBeVisible({timeout: 5_000});
    // Calendar toggle should now be active
    await expect(page.getByRole('button', {name: 'Calendar'})).toHaveAttribute('aria-pressed', 'true');
  });

  test('switching back from Weeks re-activates the calendar toggle', async ({page}) => {
    await page.getByRole('button', {name: 'Weeks'}).click();
    await expect(page.getByRole('button', {name: 'Weeks'})).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', {name: 'Calendar'}).click();
    await expect(page.getByRole('button', {name: 'Calendar'})).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.fc-multimonth')).toBeVisible();
  });
});

test.describe('Calendar date boundary regression checks', () => {
  test('events ending on the prior day do not appear on the next day, and inclusive end displays correctly', async ({page}) => {
    const suffix = Date.now();
    const overflowEventName = `e2e-overflow-guard-${suffix}`;
    const inclusiveEndEventName = `e2e-inclusive-end-${suffix}`;

    const userDataRes = await page.request.get('/api/user-data');
    expect(userDataRes.ok()).toBeTruthy();
    const userData = await userDataRes.json() as {id: string};
    const userId = userData.id;

    const createEvent = async (payload: Record<string, unknown>) => {
      const res = await page.request.post('/api/event', {data: payload});
      expect(res.ok()).toBeTruthy();
      return res.json() as Promise<{event: {id: number}}>;
    };

    // Event should include up to Apr 9 only (exclusive end Apr 10).
    const overflowEvent = await createEvent({
      userId,
      name: overflowEventName,
      eventType: 'CustomEvent',
      startDate: '2026-04-01',
      endDate: '2026-04-10',
    });

    // Event should include Apr 10,11,12 (exclusive end Apr 13).
    const inclusiveEndEvent = await createEvent({
      userId,
      name: inclusiveEndEventName,
      eventType: 'CustomEvent',
      startDate: '2026-04-10',
      endDate: '2026-04-13',
    });

    try {
      await page.goto('/user/calendar');

      // Click Apr 10 and open day drawer list.
      await page.locator('.fc-day[data-date="2026-04-10"]').first().click();
      const drawer = page.locator('.MuiDrawer-paperAnchorBottom');
      await expect(drawer).toBeVisible({timeout: 5_000});

      // Prior event (ending Apr 9 inclusive) must not appear on Apr 10.
      await expect(drawer.getByText(overflowEventName)).toHaveCount(0);
      // New event should appear on Apr 10.
      await expect(drawer.getByText(inclusiveEndEventName)).toBeVisible();

      // Open event details and verify displayed inclusive end date is Apr 12.
      await drawer.getByText(inclusiveEndEventName).click();
      await expect(drawer.getByText(inclusiveEndEventName)).toBeVisible();
      await expect(drawer.getByText(/Sun Apr 12 2026/)).toBeVisible();
      await expect(drawer.getByText(/Mon Apr 13 2026/)).toHaveCount(0);
    } finally {
      await page.request.delete(`/api/event/${overflowEvent.event.id}`);
      await page.request.delete(`/api/event/${inclusiveEndEvent.event.id}`);
    }
  });
});
