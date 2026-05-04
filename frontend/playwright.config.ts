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
  retries: 2, 
  /* Opt out of parallel tests. */
  workers: 1, 
  /* Timeout for each test in milliseconds. */
  timeout: 300000,
  reporter: ([
    ['list'],
    ['html', { open: 'never', outputFolder: './e2e/report' }],
    process.env.COLLECT_COVERAGE ? [
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
    ] : null,
  ].filter(Boolean) as any[]),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:3001',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        permissions: ['geolocation'],
        geolocation: { latitude: -6.2088, longitude: 106.8456 },
      },
    },
  ],

  webServer: [
    {
      // Frontend server
      command: 'next start --port 3001',
      url: 'http://127.0.0.1:3001/en/login/portal-admin',
      env: {
        NODE_ENV: 'test',
        NODE_OPTIONS: '--max-old-space-size=1536'
      },
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 600 * 1000,
    },
  ],
});
