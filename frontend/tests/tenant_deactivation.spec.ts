import { test, expect } from './fixtures';
import { TEST_USERS, BASE_URL, login } from './test_helper';

test.describe.serial('Superadmin Tenant Deactivation Management', () => {
  const platformAdmin = {
    email: 'superadmin@harikerja.com',
    password: 'password123'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `tenant-deactivation-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));

    // Login as Platform Superadmin on the public domain
    console.log(`--- Navigating to portal-admin login ---`);
    await page.goto(`${BASE_URL}/en/login/portal-admin-secure-39f28j`);
    
    // Ensure clean state for superadmin and force public tenant
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('test_tenant_e2e', 'public');
    });
    await page.reload();

    console.log(`--- Filling login form ---`);
    await page.fill('input[type="email"]', platformAdmin.email);
    await page.fill('input[type="password"]', platformAdmin.password);
    console.log(`--- Submitting login form ---`);
    await page.click('button[type="submit"]');
    
    // Wait for navigation and sidebar
    await page.waitForURL(/.*\/(analytics|admin\/registrations)/, { timeout: 120000 });
    await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });
  });

  test('should allow superadmin to view and toggle tenant status', async ({ page }) => {
    test.setTimeout(180000);
    
    // Accept dialogs automatically during the toggle actions
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });

    // 1. Navigate to the new Tenant Management Page
    await page.goto(`${BASE_URL}/en/admin/tenants`);
    
    // Verify Header and layout
    await expect(page.locator('h1').filter({ hasText: /Tenant Workspaces|Kelola Tenant/i }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Total Workspaces/i)).toBeVisible();

    // Verify seeded tenant is listed (e.g. company1 or company2)
    await expect(page.getByText(/company1\.(localhost|harikerja\.com)/)).toBeVisible({ timeout: 30000 });

    // 2. Search functionality
    await page.fill('input[placeholder="Search workspaces..."]', 'company1');
    // Ensure the searched item remains visible
    await expect(page.getByText(/company1\.(localhost|harikerja\.com)/)).toBeVisible();

    // 3. Toggle Status (Suspend company1)
    const row = page.locator('tr').filter({ hasText: 'company1' }).first();
    const suspendBtn = row.getByRole('button', { name: /Suspend/i });
    
    if (await suspendBtn.isVisible()) {
      const responsePromise = page.waitForResponse(
        resp => resp.url().includes('/internal/tenants/') && resp.url().includes('/toggle-active/') && resp.status() === 200,
        { timeout: 60000 }
      );
      await suspendBtn.click();
      console.log('--- Suspend button clicked, waiting for response ---');
      await responsePromise;

      // Verify status changed to SUSPENDED
      await expect(row.getByText(/SUSPENDED/i)).toBeVisible({ timeout: 10000 });
    }

    // 4. Toggle Status (Reactivate company1)
    const reactivateBtn = row.getByRole('button', { name: /Reactivate/i });
    if (await reactivateBtn.isVisible()) {
      const responsePromise = page.waitForResponse(
        resp => resp.url().includes('/internal/tenants/') && resp.url().includes('/toggle-active/') && resp.status() === 200,
        { timeout: 60000 }
      );
      await reactivateBtn.click();
      console.log('--- Reactivate button clicked, waiting for response ---');
      await responsePromise;

      // Verify status changed back to ACTIVE
      await expect(row.getByText(/ACTIVE/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should restrict non-authorized users from viewing tenants page', async ({ page }) => {
    // Clear cookies/tokens to act as non-authorized employee on a company tenant
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Login as a normal company employee / non-global-admin
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);

    // Attempt to access global tenants path directly
    await page.goto(`${BASE_URL}/en/admin/tenants`);

    // Verify Unauthorized error card is shown
    await expect(page.getByText('Unauthorized')).toBeVisible({ timeout: 30000 });
  });
});
