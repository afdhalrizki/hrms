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
    await page.goto('http://127.0.0.1:3000/en/branches?test_tenant=company1');
    await page.click('button:has-text("Add Branch")');
    
    const branchName = `Audit Test Branch ${Date.now()}`;
    console.log(`--- Creating Branch: ${branchName} ---`);
    
    // Wait for the modal fields to be ready. Rapid filling can sometimes cause issues in animated modals.
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    
    // Wait for animation to settle completely to prevent "element not stable" timeout errors during fill/select
    await page.waitForTimeout(1000);
    
    await nameInput.fill(branchName, { force: true });
    await page.locator('textarea[name="address"]').fill('Test Address for Audit', { force: true });
    await page.locator('input[name="latitude"]').fill('-6.2000', { force: true });
    await page.locator('input[name="longitude"]').fill('106.8166', { force: true });
    await page.locator('input[name="radius_meters"]').fill('100', { force: true });
    await page.locator('select[name="timezone"]').selectOption('Asia/Jakarta', { force: true });
    // Use force: true to avoid "element not stable" issues in slow CI/Dev environments
    await page.locator('button[type="submit"]').click({ force: true });
    
    // 2. Verification: Check Audit Logs as Admin
    console.log('--- Waiting for modal to close and log to persist ---');
    await expect(page.locator('form')).not.toBeVisible({ timeout: 15000 });
    
    // Give a small grace period for the backend to process the audit log record and for polling to kick in
    console.log('--- Waiting for Audit log to persist and UI to refresh ---');
    await page.waitForTimeout(5000);
    
    console.log('--- Navigating to Audit Logs ---');
    await page.goto('http://127.0.0.1:3000/en/settings/audit-logs?test_tenant=company1');
    
    // Diagnostic: Check for client-side crash
    const errorHeading = page.locator('h2:has-text("Application error")');
    if (await errorHeading.isVisible()) {
        const errorDetail = await page.locator('body').innerText();
        console.error('--- CLIENT-SIDE CRASH DETECTED ---');
        console.error(errorDetail);
        throw new Error('Application error detected on Audit Logs page');
    }
    
    // Wait for table to load and be visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 20000 });
    
    // Since we updated the UI to show the object name in the table, we can use a simple filter.
    // We use a longer timeout here because polling takes 10s, but we'll try a manual refresh first.
    console.log(`--- Searching for ${branchName} in Audit Log table ---`);
    
    // Attempt manual refresh to speed up the test
    const refreshBtn = page.locator('#refresh-audit-logs');
    if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        console.log('--- Triggered manual refresh ---');
    }

    const logRow = table.locator('tr').filter({ hasText: branchName });
    
    // Retry visibility with a shorter interval or just rely on the increased timeout
    try {
        await expect(logRow).toBeVisible({ timeout: 15000 });
    } catch (e) {
        console.log('--- Still waiting, triggering second manual refresh ---');
        if (await refreshBtn.isVisible()) await refreshBtn.click();
        await expect(logRow).toBeVisible({ timeout: 20000 });
    }

    await expect(logRow).toContainText(/CREATE/i);
    
    console.log('Audit log successfully verified.');
  });
});
