import { test, expect } from './fixtures';
import { getTenantUrl } from './test_helper';

test.describe('Private to Login Redirection', () => {
  const privateRoutes = [
    '/en/profile',
    '/en/attendance',
    '/en/leaves',
  ];

  for (const route of privateRoutes) {
    test(`should redirect from ${route} to /en/login without stuck spinner`, async ({ page }) => {
      const url = getTenantUrl(route);
      
      // Listen to console logs
      page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
      
      // 0. Ensure we are in a clean state
      await page.goto(getTenantUrl('/en'));
      await page.evaluate(() => localStorage.clear());
      
      // 1. Visit private route
      console.log(`Navigating to ${url}...`);
      
      // Trigger navigation but don't await full load if it might redirect
      await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(e => console.log('GOTO Error (expected if redirecting):', e.message));
      
      // 2. Wait for redirection to login
      console.log('Waiting for URL to change to /login...');
      await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
      console.log('Successfully redirected to login');

      // 3. Check for the spinner (it should be GONE)
      const spinner = page.locator('text=Authenticating...');
      await expect(spinner).not.toBeVisible();

      // 4. Verify login page content
      const loginHeading = page.locator('h1');
      await expect(loginHeading).toContainText(/Sign In|Masuk|Login/i);
    });
  }
});
