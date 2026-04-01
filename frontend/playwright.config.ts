import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // At least 1 retry for flakey tests
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined, // Auto-detect workers for local, 1 for CI stability
  /* Timeout for each test in milliseconds. */
  // timeout: 90000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Using build and start for much faster test execution (no compilation lag during tests)
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000/en', // Match the localized route
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 300 * 1000,
  },
});
