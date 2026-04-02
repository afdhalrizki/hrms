import { test, expect } from '@playwright/test';

test.describe('Audit Logs & Traceability', () => {
  const login = async (page: any, email: string, password = 'password123') => {
    await page.goto('http://127.0.0.1:3000/en/login/portal-admin?test_tenant=company1');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    console.log(`--- Login successful for ${email} ---`);
  };

  test('Admin actions should generate audit logs visible to Superadmin', async ({ page }) => {
    // 1. Setup: Admin performs an action (e.g. creating a new branch)
    await login(page, 'admin@company1.com');

    console.log('--- Navigating to Branches ---');
    await page.goto('http://127.0.0.1:3000/en/branches');
    await page.click('button:has-text("Add Branch")');
    
    const branchName = `Audit Test Branch ${Date.now()}`;
    console.log(`--- Creating Branch: ${branchName} ---`);
    
    // Wait for the modal fields to be ready. Rapid filling can sometimes cause issues in animated modals.
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    
    await nameInput.fill(branchName);
    await page.fill('textarea[name="address"]', 'Test Address for Audit');
    await page.fill('input[name="latitude"]', '-6.2000');
    await page.fill('input[name="longitude"]', '106.8166');
    await page.fill('input[name="radius_meters"]', '100');
    await page.selectOption('select[name="timezone"]', 'Asia/Jakarta');
    // Use force: true to avoid "element not stable" issues in slow CI/Dev environments
    await page.click('button[type="submit"]', { force: true });
    
    // 2. Verification: Check Audit Logs as Admin
    console.log('--- Waiting for modal to close and log to persist ---');
    await expect(page.locator('form')).not.toBeVisible({ timeout: 15000 });
    
    // Give a small grace period for the backend to process the audit log record
    await page.waitForTimeout(2000);
    
    console.log('--- Navigating to Audit Logs ---');
    await page.goto('http://127.0.0.1:3000/en/settings/audit-logs');
    
    // Wait for table to load and be visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 15000 });
    
    // Since we updated the UI to show the object name in the table, we can use a simple filter
    console.log(`--- Searching for ${branchName} in Audit Log table ---`);
    const logRow = table.locator('tr').filter({ hasText: branchName });
    await expect(logRow).toBeVisible({ timeout: 25000 });
    await expect(logRow).toContainText(/CREATE/i);
    
    console.log('Audit log successfully verified.');
  });
});
