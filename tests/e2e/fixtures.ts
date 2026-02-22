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
    page.on('pageerror', (err) => pageErrors.push(err));

    await use(page);

    if (pageErrors.length > 0) {
      throw new Error(
        `Unhandled page error(s):\n${pageErrors.map((e) => `  ${e.message}`).join('\n')}`,
      );
    }
  },
});

export { expect } from '@playwright/test';
