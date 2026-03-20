/**
 * Shared Playwright fixtures.
 *
 * All test files should import `test` and `expect` from here instead of
 * directly from `@playwright/test`.  The extended `page` fixture attaches a
 * `pageerror` listener so that any unhandled JavaScript exception thrown in
 * the browser automatically fails the surrounding test.
 *
 * ── STRICT MODE ─────────────────────────────────────────────────────────────
 * Playwright locators operate in strict mode: if a locator matches MORE THAN
 * ONE element the call throws immediately — even inside `expect()`.
 *
 * Rules to follow when writing locators:
 *   1. Prefer semantic locators: getByRole(), getByLabel(), getByTestId().
 *      These are naturally more specific than CSS / text selectors.
 *   2. If a locator CAN match multiple elements, narrow it IMMEDIATELY:
 *        page.getByRole('listitem').first()       // ✅ explicit first
 *        page.getByText('Week').nth(2)            // ✅ explicit index
 *        page.locator('.card', { hasText: /W\d+/ }).first()  // ✅ filtered
 *   3. Never leave an unnarrowed locator that could match > 1 element:
 *        page.getByRole('listitem')               // ❌ may match many
 *        page.getByText('Week')                   // ❌ likely matches many
 *   4. The eslint-plugin-playwright rules in eslint.config.mjs enforce
 *      additional quality constraints, but strict mode violations are runtime
 *      errors — no static rule catches all of them.  Audit every locator.
 * ────────────────────────────────────────────────────────────────────────────
 */
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      // Playwright's WebKit (Mobile Safari) fires window.onerror for same-origin
      // fetch requests that are blocked during client-side navigation. This is a
      // test-environment artefact — real Mobile Safari handles these requests fine.
      // The phrase "due to access control checks" is WebKit-specific and does not
      // appear in normal JavaScript errors, so the filter is narrow and safe.
      if (err.message.includes('due to access control checks')) return;
      pageErrors.push(err);
    });

    await use(page);

    if (pageErrors.length > 0) {
      throw new Error(
        `Unhandled page error(s):\n${pageErrors.map((e) => `  ${e.message}`).join('\n')}`,
      );
    }
  },
});

export { expect } from '@playwright/test';
