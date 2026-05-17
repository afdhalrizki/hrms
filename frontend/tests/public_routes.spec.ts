import { test, expect } from './fixtures';
import { getTenantUrl, BASE_URL } from './test_helper';

test.describe('Public Routes Accessibility', () => {
  // Test accessibility of new and existing public routes
  const publicRoutes = [
    { path: '/en', expectedTitle: /HR Management|SDM|Simpel|Akurat|Scale|Workforce/i },
    { path: '/en/about', expectedTitle: /HariKerja|Tentang|About/i },
    { path: '/en/login', expectedTitle: /Sign In|Masuk|Login/i },
    { path: '/en/signup', expectedTitle: /Scale|Create|Account|Kembangkan|Buat/i },
  ];

  for (const route of publicRoutes) {
    test(`should allow unauthenticated access to ${route.path}`, async ({ page }) => {
      const targetUrl = `${BASE_URL}${route.path}`;
      console.log(`Navigating to: ${targetUrl}`);
      
      // Navigate to the public route directly
      await page.goto(targetUrl, { waitUntil: 'load' });
      
      // Give it a moment to stabilize (handle client-side redirects if any)
      await page.waitForTimeout(2000);

      // 1. Should NOT redirect unauthenticated users to login (if not already login)
      if (route.path !== '/en/login') {
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
      }
      
      // 2. Should NOT show the "Authenticating..." spinner
      const spinner = page.locator('text=Authenticating...');
      await expect(spinner).not.toBeVisible();
      
      // 3. Should render the correct content
      const heading = page.locator('main h1, h1').first();
      try {
        await expect(heading).toContainText(route.expectedTitle, { timeout: 5000 });
      } catch (err) {
        console.log(`FAILED ROUTE: ${route.path}`);
        console.log(`FINAL URL: ${page.url()}`);
        console.log(`PAGE TITLE: ${await page.title()}`);
        const bodyText = await page.innerText('body');
        console.log(`BODY SNIPPET: ${bodyText.substring(0, 500)}`);
        throw err;
      }
    });
  }
});
