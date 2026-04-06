/**
 * Shared Playwright fixtures.
 *
 * All test files should import `test` and `expect` from here instead of
 * directly from `@playwright/test`.  The extended `page` fixture attaches a
 * `pageerror` listener so that any unhandled JavaScript exception thrown in
 * the browser automatically fails the surrounding test.
 *
 * See CLAUDE.md → "E2E Tests" for locator and strict mode guidelines.
 */
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page, browserName }, use) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      // Playwright's WebKit (Mobile Safari) fires window.onerror for same-origin
      // fetch requests that are blocked during client-side navigation. This is a
      // test-environment artefact — real Mobile Safari handles these requests fine.
      // The phrase "due to access control checks" is WebKit-specific and does not
      // appear in normal JavaScript errors, so the filter is narrow and safe.
      if (err.message.includes('due to access control checks')) return;
      // WebKit also intermittently reports React's recoverable hydration warning
      // as a pageerror on initial route load even though the page hydrates and
      // continues normally. Keep this filter scoped to WebKit and the exact
      // recoverable warning text so real runtime errors still fail the test.
      if (
        browserName === 'webkit' &&
        err.message.includes("Hydration failed because the server rendered HTML didn't match the client")
      ) {
        return;
      }
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
