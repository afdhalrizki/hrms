import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('Audit Logs & Traceability', () => {
  const admin = TEST_USERS.admin;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `audit-logs-failure.png`, fullPage: true });
    }
  });

  test('Admin actions should generate audit logs visible in Settings', async ({ page }) => {
    // 1. Setup: Admin performs an action (e.g. creating a new branch)
    await login(page, admin.email, admin.password);

    console.log('--- Navigating to Branches ---');
    await page.goto(getTenantUrl('/en/branches'));
    
    const addBtn = page.getByRole('button', { name: /Add Branch/i });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    
    const branchName = `Audit Test Branch ${Date.now()}`;
    console.log(`--- Creating Branch for Audit: ${branchName} ---`);
    
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await page.locator('input[name="name"]').fill(branchName, { force: true });
    await page.locator('textarea[name="address"]').fill('Test Address for Audit', { force: true });
    await page.locator('input[name="latitude"]').fill('-6.21', { force: true });
    await page.locator('input[name="longitude"]').fill('106.82', { force: true });
    await page.locator('input[name="radius_meters"]').fill('100', { force: true });
    await page.locator('select[name="timezone"]').selectOption('Asia/Jakarta', { force: true });
    
    await page.getByRole('button', { name: /Create Branch/i }).click({ force: true });
    
    // 2. Verification: Check Audit Logs
    await expect(page.getByText(/Branch created successfully/i)).toBeVisible({ timeout: 15000 });
    
    // Give a small grace period for the backend to process the audit record
    await page.waitForTimeout(3000);
    
    console.log('--- Navigating to Audit Logs ---');
    await page.goto(getTenantUrl('/en/settings/audit-logs'));
    
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 30000 });
    
    // Since we created a branch with high unique name, verify it appears in the log
    // Attempts manual refresh if available
    const refreshBtn = page.locator('#refresh-audit-logs');
    if (await refreshBtn.isVisible()) await refreshBtn.click();

    const logRow = table.locator('tr').filter({ hasText: branchName });
    await expect(logRow).toBeVisible({ timeout: 30000 });
    await expect(logRow).toContainText(/CREATE/i);
  });
});
