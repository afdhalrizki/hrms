import { test, expect } from './fixtures';
import { BASE_URL } from './test_helper';

test.describe.serial('Global Admin Management', () => {
  const superadmin = {
    email: 'superadmin@harikerja.com',
    password: 'password123'
  };

  test.beforeEach(async ({ page }) => {
    // Login as Platform Superadmin on the public domain
    await page.goto(`${BASE_URL}/en/login/portal-admin`);
    
    // Ensure clean state for superadmin and force public tenant
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('test_tenant_e2e', 'public');
    });
    await page.reload();

    await page.fill('input[type="email"]', superadmin.email);
    await page.fill('input[type="password"]', superadmin.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation and sidebar
    await page.waitForURL(/.*\/(analytics|admin\/registrations)/, { timeout: 120000 });
    await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });
  });

  test('should allow superadmin to view and manage global admins', async ({ page }) => {
    const uniqueEmail = `testagent_${Date.now()}@harikerja.com`;
    // 1. Navigate to Global Admins page
    await page.goto(`${BASE_URL}/en/admin/global-admins`);
    
    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: /Global Admins/i })).toBeVisible({ timeout: 20000 });
    
    // 2. Add a new admin
    await page.getByRole('button', { name: /Add Admin/i }).click();
    await expect(page.getByText('Add Global Admin')).toBeVisible();
    
    const modal = page.locator('.glass-card').filter({ hasText: 'Add Global Admin' });
    const inputs = modal.locator('input');
    await inputs.nth(0).fill('Test'); // First Name
    await inputs.nth(1).fill('Agent'); // Last Name
    await inputs.nth(2).fill(uniqueEmail); // Email
    
    const select = modal.locator('select');
    await select.selectOption('SUPPORT_AGENT');
    
    await inputs.nth(3).fill('password123'); // Password
    
    const saveResponsePromise = page.waitForResponse(res => res.url().includes('/internal/global-admins/') && res.request().method() === 'POST');
    await modal.getByRole('button', { name: /Save/i }).click();
    const saveResponse = await saveResponsePromise;
    console.log(`[TEST DEBUG] POST response status: ${saveResponse.status()}`);
    
    await expect(page.getByText('Global admin created successfully')).toBeVisible();
    
    // 3. Verify it appears in the list
    await expect(page.getByText(uniqueEmail)).toBeVisible({ timeout: 15000 });
    
    // 4. Delete the admin
    const newAdminRow = page.locator('tr').filter({ hasText: uniqueEmail });
    const deleteBtn = newAdminRow.locator('button[title="Delete"]');
    
    // We need to handle window.confirm
    page.once('dialog', dialog => dialog.accept());
    const deleteResponsePromise = page.waitForResponse(res => res.url().includes('/internal/global-admins/') && res.request().method() === 'DELETE');
    await deleteBtn.click();
    const deleteResponse = await deleteResponsePromise;
    console.log(`[TEST DEBUG] DELETE response status: ${deleteResponse.status()}`);
    if (!deleteResponse.ok()) {
      console.log(`[TEST DEBUG] DELETE response body: ${await deleteResponse.text()}`);
    }
    
    await expect(page.getByText('Global admin deleted successfully')).toBeVisible();
    await expect(page.getByText(uniqueEmail)).not.toBeVisible();
  });
});
