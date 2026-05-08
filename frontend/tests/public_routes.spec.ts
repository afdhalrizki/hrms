import { test, expect } from './fixtures';
import { getTenantUrl } from './test_helper';

test.describe('Public Routes Accessibility', () => {
  // Test accessibility of new and existing public routes
  const publicRoutes = [
    { path: '/en', expectedTitle: /harikerja/i },
    { path: '/en/about', expectedTitle: /About/i },
    { path: '/en/pricelist', expectedTitle: /Price/i },
    { path: '/en/login', expectedTitle: /Sign In|Masuk|Login/i },
    { path: '/en/signup', expectedTitle: /Start|Daftar|Get Started|Account|Scale/i },
  ];

  for (const route of publicRoutes) {
    test(`should allow unauthenticated access to ${route.path}`, async ({ page }) => {
      const url = getTenantUrl(route.path);
      
      // Navigate to the public route
      await page.goto(url);

      // 1. Should NOT redirect unauthenticated users to login (if not already login)
      if (route.path !== '/en/login') {
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
      }
      
      // 2. Should NOT show the "Authenticating..." spinner
      // This verifies that DashboardLayout correctly identifies the route as public
      const spinner = page.locator('text=Authenticating...');
      await expect(spinner).not.toBeVisible();
      
      // 3. Should render the correct content
      const heading = page.locator('h1');
      await expect(heading).toContainText(route.expectedTitle);
      
      // 4. Verify no redirect loops happened (page stays stable)
      await page.waitForTimeout(1000);
      expect(page.url()).toContain(route.path);
    });
  }
});
