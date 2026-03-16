import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ['github'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['html', { open: 'never' }],
      ]
    : [['html', { open: 'on-failure' }]],
  // In CI, Next.js dev server compiles pages on first access (~5s per page).
  // Raise expect timeout to 15s so URL/visibility assertions don't time out
  // during first-load compilation.
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    /* Auth setup — runs once before all authenticated tests */
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },

    /* Desktop browsers — depend on auth setup */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        serviceWorkers: 'block',
      },
      dependencies: ['setup'],
    },

    /* Mobile viewports — depend on auth setup */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
        serviceWorkers: 'block',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 13'],
        storageState: 'playwright/.auth/user.json',
        serviceWorkers: 'block',
      },
      dependencies: ['setup'],
    },
  ],
});
