/**
 * Shared Playwright fixtures.
 *
 * All test files should import `test` and `expect` from here instead of
 * directly from `@playwright/test`.  The extended `page` fixture attaches a
 * `pageerror` listener so that any unhandled JavaScript exception thrown in
 * the browser automatically fails the surrounding test.
 */
import { test as base, expect } from '@playwright/test';

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
