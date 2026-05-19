import { test, expect } from './fixtures';
import { BASE_URL } from './test_helper';

test.describe.serial('Platform Settings RBAC E2E', () => {
  const superadmin = {
    email: 'superadmin@harikerja.com',
    password: 'password123'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `settings-rbac-failure.png`, fullPage: true });
    }
  });

  test('should allow superadmin to view and edit platform settings without lock message', async ({ page }) => {
    // 1. Login as Platform Superadmin
    await page.goto(`${BASE_URL}/en/login/portal-admin`);
    
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('test_tenant_e2e', 'public');
    });
    await page.reload();

    await page.fill('input[type="email"]', superadmin.email);
    await page.fill('input[type="password"]', superadmin.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*\/(analytics|admin\/registrations)/, { timeout: 120000 });
    await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });

    // 2. Navigate to Settings page
    await page.goto(`${BASE_URL}/en/settings?test_tenant=public`);
    await expect(page.locator('h1').filter({ hasText: /Company Profile Settings/i })).toBeVisible({ timeout: 20000 });

    // 3. Verify Locked banner is NOT visible
    await expect(page.getByText('Read-Only Access')).not.toBeVisible();

    // 4. Verify inputs are enabled
    const companyNameInput = page.locator('input[placeholder="e.g. PT Maju Bersama"]').first();
    await expect(companyNameInput).toBeEnabled();

    const saveBtn = page.getByRole('button', { name: /Save Profile/i });
    await expect(saveBtn).toBeEnabled();
  });

  test('should restrict non-superadmin global admin from editing settings and show read-only locked message', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER_CONSOLE] ${msg.text()}`));
    // 1. Login as Platform Superadmin to create a support agent first
    await page.goto(`${BASE_URL}/en/login/portal-admin`);
    
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('test_tenant_e2e', 'public');
    });
    await page.reload();

    await page.fill('input[type="email"]', superadmin.email);
    await page.fill('input[type="password"]', superadmin.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*\/(analytics|admin\/registrations)/, { timeout: 120000 });
    await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });

    // Create a support agent dynamically
    const uniqueEmail = `settings_agent_${Date.now()}@harikerja.com`;
    await page.goto(`${BASE_URL}/en/admin/global-admins`);
    await expect(page.locator('h1').filter({ hasText: /Global Admins/i })).toBeVisible({ timeout: 20000 });
    
    await page.getByRole('button', { name: /Add Admin/i }).click();
    const modal = page.locator('.glass-card').filter({ hasText: 'Add Global Admin' });
    await modal.locator('input[type="text"]').nth(0).fill('Support');
    await modal.locator('input[type="text"]').nth(1).fill('Agent');
    await modal.locator('input[type="email"]').fill(uniqueEmail);
    
    const select = modal.locator('select');
    await select.selectOption('SUPPORT_AGENT');
    await modal.locator('input[type="password"]').fill('password123');
    
    const savePromise = page.waitForResponse(res => res.url().includes('/internal/global-admins/') && res.request().method() === 'POST');
    await modal.getByRole('button', { name: /Save/i }).click();
    await savePromise;
    await expect(page.getByText('Global admin created successfully')).toBeVisible();

    // 2. Logout
    await page.goto(`${BASE_URL}/en/settings?test_tenant=public`);
    const logoutBtn = page.getByRole('button', { name: /Logout|Sign Out/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    
    const confirmBtn = page.getByRole('button', { name: /Confirm/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await page.waitForURL(/.*\/login/);

    // 3. Login as the newly created Support Agent
    await page.goto(`${BASE_URL}/en/login/portal-admin`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('test_tenant_e2e', 'public');
    });
    await page.reload();

    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect and sidebar
    await expect(page.locator('aside')).toBeVisible({ timeout: 120000 });

    // 4. Navigate to Settings page
    await page.goto(`${BASE_URL}/en/settings?test_tenant=public`);
    await expect(page.locator('h1').filter({ hasText: /Company Profile Settings/i })).toBeVisible({ timeout: 20000 });

    // 5. Verify Locked banner is visible
    await expect(page.getByText(/Read-Only: Only SUPERADMIN/i)).toBeVisible();

    // 6. Verify inputs are disabled
    const companyNameInput = page.locator('input[placeholder="e.g. PT Maju Bersama"]').first();
    await expect(companyNameInput).toBeDisabled();

    // 7. Verify Save Profile button is disabled
    const saveBtn = page.getByRole('button', { name: /Save Profile/i });
    await expect(saveBtn).toBeDisabled();
  });
});
