import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Directory for artifacts like screenshots and traces. */
  outputDir: './e2e/test-results',
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
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: './e2e/report' }],
    [
      'monocart-reporter',
      {
        name: 'HRMS Frontend E2E Coverage Report',
        outputFile: './e2e/coverage/index.html',
        coverage: {
          entryFilter: (entry: any) =>
            entry.url.includes('_next/static') && !entry.url.includes('vendor'),
          sourceFilter: (sourcePath: string) =>
            sourcePath.includes('src') && !sourcePath.includes('node_modules'),
          reports: ['v8', 'console-summary', 'lcov', 'html'],
        },
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:3000',

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

  webServer: [
    {
      // Frontend server
      command: 'npm run start',
      url: 'http://127.0.0.1:3000/en/',
      env: {
        NODE_ENV: 'test',
      },
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 600 * 1000,
    },
    {
      // Backend server (Django)
      command: 'npm run start:backend:test',
      url: 'http://127.0.0.1:8000/api/schema/',
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 600 * 1000,
    },
  ],
});
