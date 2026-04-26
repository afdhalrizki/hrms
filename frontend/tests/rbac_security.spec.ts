import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('RBAC Security & Permissions', () => {
  const admin = TEST_USERS.admin;
  const manager = TEST_USERS.manager;
  const employee = TEST_USERS.employee;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `rbac-failure.png`, fullPage: true });
    }
  });

  test('Employee should be restricted from Admin-only routes', async ({ page }) => {
    await login(page, employee.email, employee.password);

    console.log('--- Testing Employee Restriction for Branding ---');
    // Try to access Branding settings, which is admin-only.
    await page.goto(getTenantUrl('/en/settings/branding'));
    await page.waitForLoadState('networkidle');

    // Verify restriction message from real backend/frontend guarding
    const restrictedTitle = page.getByRole('heading', { name: /Restricted Access/i });
    await expect(restrictedTitle).toBeVisible({ timeout: 15000 });

    const brandingHeader = page.locator('main h1').getByText(/Branding/i);
    await expect(brandingHeader).not.toBeVisible();
  });

  test('Manager should have access to Performance but not Branding', async ({ page }) => {
    await login(page, manager.email, manager.password);

    console.log('--- Testing Manager Access for Performance ---');
    // Manager has manage_performance permission in seed
    await page.goto(getTenantUrl('/en/performance'));
    await page.waitForLoadState('networkidle');

    const performanceHeader = page.getByRole('heading', { name: /Performance/i, level: 1 });
    await expect(performanceHeader).toBeVisible({ timeout: 20000 });

    console.log('--- Testing Manager Restriction for Branding ---');
    // Should NOT have access to Branding
    await page.goto(getTenantUrl('/en/settings/branding'));
    
    // Explicitly wait for the restriction message or the heading
    await expect(page.getByRole('heading', { name: /Restricted Access|Denied/i })).toBeVisible({ timeout: 20000 });
  });

  test('Admin should have full access to multiple modules', async ({ page }) => {
    await login(page, admin.email, admin.password);

    const routes = [
      { path: '/en/employees', heading: /Employee|HR/i },
      { path: '/en/payroll', heading: /Payroll/i },
      { path: '/en/settings/roles', heading: /Audit|Role/i },
      { path: '/en/workflows', heading: /Approval|Workflow/i },
    ];

    for (const route of routes) {
      console.log(`--- Testing Admin Access for ${route.path} ---`);
      await page.goto(getTenantUrl(route.path));
      await page.waitForLoadState('networkidle');

      // Ensure NO restriction message is shown
      await expect(page.getByText(/Restricted Access|Premium Feature/i)).not.toBeVisible();

      // Ensure the correct heading is shown
      const heading = page.locator('h1').filter({ hasText: route.heading });
      await expect(heading).toBeVisible({ timeout: 15000 });
    }
  });
});
