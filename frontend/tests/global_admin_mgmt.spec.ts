import { test, expect } from './fixtures';
import { BASE_URL } from './test_helper';
import { execSync } from 'child_process';

test.describe.serial('Global Admin Management', () => {
  const superadmin = {
    email: 'superadmin@harikerja.com',
    password: 'password123'
  };

  test.beforeEach(async ({ page }) => {
    try {
      execSync('PGPASSWORD=hrms_password psql -h localhost -p 5433 -U hrms_user -d hrms -c "DELETE FROM users_user_tenants WHERE user_id IN (SELECT id FROM users_user WHERE email LIKE \'support_agent_%\' OR email LIKE \'testagent_%\'); DELETE FROM users_user WHERE email LIKE \'support_agent_%\' OR email LIKE \'testagent_%\';"');
    } catch (e) {
      console.warn('DB cleanup warning:', e);
    }
    // Login as Platform Superadmin on the public domain
    await page.goto(`${BASE_URL}/en/login/portal-admin-secure-39f28j`);
    
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
    await modal.locator('input[type="text"]').nth(0).fill('Test'); // First Name
    await modal.locator('input[type="text"]').nth(1).fill('Agent'); // Last Name
    await modal.locator('input[type="email"]').fill(uniqueEmail); // Email
    
    const select = modal.locator('select');
    await select.selectOption('SUPPORT_AGENT');
    
    await modal.locator('input[type="password"]').fill('password123'); // Password
    
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

  test('should allow support agent to masquerade only into assigned tenant', async ({ page }) => {
    const agentEmail = `support_agent_${Date.now()}@harikerja.com`;
    
    // 1. Navigate to Global Admins page
    await page.goto(`${BASE_URL}/en/admin/global-admins`);
    await expect(page.locator('h1').filter({ hasText: /Global Admins/i })).toBeVisible({ timeout: 20000 });
    
    // 2. Add support agent with assigned tenant
    await page.getByRole('button', { name: /Add Admin/i }).click();
    await expect(page.getByText('Add Global Admin')).toBeVisible();
    
    const modal = page.locator('.glass-card').filter({ hasText: 'Add Global Admin' });
    await modal.locator('input[type="text"]').nth(0).fill('Support');
    await modal.locator('input[type="text"]').nth(1).fill('Agent');
    await modal.locator('input[type="email"]').fill(agentEmail);
    await modal.locator('select').selectOption('SUPPORT_AGENT');
    
    // Select Company1 checkbox
    const checkboxContainer = modal.locator('div', { hasText: 'Assign Tenants' });
    await expect(checkboxContainer).toBeVisible();
    
    const targetCheckbox = checkboxContainer.locator('label', { hasText: 'Company1' }).locator('input[type="checkbox"]');
    await expect(targetCheckbox).toBeVisible();
    await targetCheckbox.check();
    const assignedSchema = 'company1';
    console.log(`[TEST DEBUG] Assigning support agent to schema: ${assignedSchema}`);
    
    await modal.locator('input[type="password"]').fill('password123');
    
    // Save
    const savePromise = page.waitForResponse(res => res.url().includes('/internal/global-admins/') && res.request().method() === 'POST');
    await modal.getByRole('button', { name: /Save/i }).click();
    await savePromise;
    
    await expect(page.getByText('Global admin created successfully')).toBeVisible();
    
    // Verify name is shown in the table
    const row = page.locator('tr').filter({ hasText: agentEmail });
    await expect(row).toContainText(/Tenants:/i);
    
    // 3. Log out superadmin
    await page.goto(`${BASE_URL}/en/settings`);
    await page.getByRole('button', { name: /Logout|Sign Out/i }).click();
    await expect(page).toHaveURL(/.*\/login/);
    
    // 4. Log in as the support agent on the public domain
    await page.goto(`${BASE_URL}/en/login/portal-admin-secure-39f28j`);
    // Ensure storage is clean
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('test_tenant_e2e', 'public');
    });
    await page.reload();
    
    await page.fill('input[type="email"]', agentEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // A support agent who logs into the public admin portal has no tenant home,
    // but they can access the public admin portal or we can simulate masquerading.
    // Wait for login redirection to public dashboard/unauthorized or general page
    await page.waitForURL(/.*\/admin\/registrations/);
    
    // 5. Try to masquerade into the assigned tenant
    console.log(`[TEST DEBUG] Attempting to masquerade into assigned tenant: ${assignedSchema}`);
    await page.evaluate((schema) => {
      sessionStorage.setItem('test_tenant_e2e', schema);
    }, assignedSchema);
    
    // Go to a private page under that tenant (using settings page because it is safe and exists on all tenants)
    await page.goto(`${BASE_URL}/en/settings?test_tenant=${assignedSchema}`);
    
    // Since support agents have GLOBAL_MASQUERADE, they bypass TenantAccessMiddleware check for assigned tenant.
    // Let's verify we are NOT redirected to the login page (i.e., we are on the settings page or stay authenticated).
    await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveURL(/.*\/settings/);
    
    // 6. Try to masquerade into another tenant (e.g. one not assigned to them, like "company2" or "worker_7" or similar)
    const unassignedSchema = assignedSchema === 'company1' ? 'company2' : 'company1';
    console.log(`[TEST DEBUG] Attempting to masquerade into unassigned tenant: ${unassignedSchema}`);
    
    await page.evaluate((schema) => {
      sessionStorage.setItem('test_tenant_e2e', schema);
    }, unassignedSchema);
    
    await page.goto(`${BASE_URL}/en/settings?test_tenant=${unassignedSchema}`);
    
    // Because they are NOT assigned to this tenant, the middleware should reject and log them out!
    // They will be redirected to the login page.
    await expect(page).toHaveURL(/.*\/login/);
  });
});
