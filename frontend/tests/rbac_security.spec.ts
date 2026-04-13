import { test, expect } from '@playwright/test';

test.describe('RBAC Security & Permissions', () => {
  // We'll use the seeded users:
  // admin@company1.com (Admin)
  // manager1@company1.com (Manager)
  // employee1@company1.com (Employee)

  test.beforeEach(async ({ page }) => {
    // Add console logging to catch frontend errors during tests
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });
  });

  const login = async (page: any, email: string, password = 'password123') => {
    await page.goto(
      'http://127.0.0.1:3000/en/login/portal-admin?test_tenant=company1',
    );
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for the dashboard to load completely
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    // Wait for initial data fetches to settle
    await page.waitForLoadState('networkidle');
    console.log(`--- Login successful for ${email} ---`);
  };

  test('Employee should be restricted from Admin-only routes', async ({
    page,
  }) => {
    await login(page, 'employee1@company1.com');

    console.log(
      '--- Testing Employee Restriction for /en/settings/branding ---',
    );
    // Try to access Branding settings, which is admin-only.
    await page.goto(
      'http://127.0.0.1:3000/en/settings/branding?test_tenant=company1',
    );
    await page.waitForLoadState('networkidle');

    const restrictedTitle = page.getByRole('heading', {
      name: /Restricted Access/i,
    });
    await expect(restrictedTitle).toBeVisible({ timeout: 10000 });

    const brandingHeader = page.locator('main h1').getByText(/Branding/i);
    await expect(brandingHeader).not.toBeVisible();

    console.log('Employee successfully restricted from Branding.');
  });

  test('Manager should have access to Performance but not Settings', async ({
    page,
  }) => {
    await login(page, 'manager1@company1.com');

    console.log('--- Testing Manager Access for /en/performance ---');
    // Should have access to Performance
    await page.goto('http://127.0.0.1:3000/en/performance');
    await page.waitForLoadState('networkidle');

    // Be specific about the heading to avoid ambiguity
    const performanceHeader = page.locator('h1').getByText(/Performance/i);
    await expect(performanceHeader).toBeVisible({ timeout: 15000 });
    console.log('Manager successfully accessed Performance.');

    console.log(
      '--- Testing Manager Restriction for /en/settings/branding ---',
    );
    // Should NOT have access to Branding/Settings
    await page.goto('http://127.0.0.1:3000/en/settings/branding');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/Restricted Access|Premium Feature/i),
    ).toBeVisible({ timeout: 10000 });

    // Ensure the Admin-only heading is NOT visible
    const brandingHeader = page
      .locator('main h1')
      .filter({ hasText: /Branding/i });
    await expect(brandingHeader).not.toBeVisible();

    console.log('Manager successfully restricted from Branding.');
  });

  test('Admin should have full access to all modules', async ({ page }) => {
    await login(page, 'admin@company1.com', 'password123');

    const routes = [
      { path: '/en/employees', heading: /Employee/i },
      { path: '/en/payroll', heading: /Payroll/i },
      { path: '/en/settings/roles', heading: /Audit|Role/i },
      { path: '/en/workflows', heading: /Approval|Workflow/i },
    ];

    for (const route of routes) {
      console.log(`--- Testing Admin Access for ${route.path} ---`);
      await page.goto(`http://127.0.0.1:3000${route.path}`);
      await page.waitForLoadState('networkidle');

      // Ensure NO restriction message is shown
      await expect(
        page.getByText(/Restricted Access|Premium Feature/i),
      ).not.toBeVisible();

      // Ensure the correct heading is shown. We use a more flexible matcher for headings.
      const heading = page.locator('h1').filter({ hasText: route.heading });
      await expect(heading).toBeVisible({ timeout: 15000 });

      console.log(`Admin successfully accessed ${route.path}.`);
    }
  });
});
