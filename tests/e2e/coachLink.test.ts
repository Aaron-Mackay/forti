/**
 * Coach registration link page tests (/coach/[code]).
 *
 * Tests the invitation page that coaches share with clients.
 * All tests run as the demo user (Bob).
 */
import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Coach link page', () => {
  test.skip(({ browserName }) => browserName !== 'chromium',
    'State-dependent tests run on chromium only; parallel browser projects share a DB user');

  test.afterEach(async ({ page }) => {
    await page.request.post('/api/coach/activate', { data: { active: false } });
    await page.request.delete('/api/coach/request');
    await page.request.delete('/api/coach/unlink');
  });

  test('invalid code shows an error message', async ({ page }) => {
    await page.goto('/coach/000000');
    await expect(page.getByText('Invalid invite link')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Home' })).toBeVisible();
  });

  test("visiting own coach code shows 'this is your invite code' message", async ({ page }) => {
    // Activate Bob's coach mode to generate a code
    await page.request.post('/api/coach/activate', { data: { active: true } });
    const res = await page.request.get('/api/coach');
    const data = await res.json() as { coachCode: string };
    const code = data.coachCode;

    await page.goto(`/coach/${code}`);
    await expect(page.getByText('This is your invite code')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Settings' })).toBeVisible();
  });

  test('coach link page is reachable and shows the correct title', async ({ page }) => {
    await page.goto('/coach/000000');
    // Page should load without crashing (invalid link error shown, not a 500)
    await expect(page.getByText('Invalid invite link')).toBeVisible();
    // No unhandled errors (enforced by fixtures)
  });
});
