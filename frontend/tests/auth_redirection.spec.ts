import { test, expect } from './fixtures';
import { getTenantUrl } from './test_helper';

test.describe('DashboardLayout Authentication Redirection', () => {
  const protectedRoutes = [
    '/en/profile',
    '/en/attendance',
    '/en/leaves',
    '/en/payroll',
    '/en/reimbursements',
    '/en/employees',
    '/en/branches',
    '/en/analytics',
    '/en/settings',
    '/en/settings/branding',
    '/en/settings/billing',
  ];

  for (const route of protectedRoutes) {
    test(`should redirect unauthenticated users accessing ${route} to /login`, async ({ page }) => {
      // Go to the protected page directly
      const url = getTenantUrl(route);
      await page.goto(url);

      // Should immediately detect no session and redirect to /login
      // The redirection target usually includes the locale and login path
      await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });
    });
  }
});
