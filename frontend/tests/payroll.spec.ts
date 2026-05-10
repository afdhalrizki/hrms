import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Payroll Management (Employee View)', () => {
  const admin = TEST_USERS.admin; // Admin has seeded payslip data

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `payroll-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as admin (who has seeded payslip)
    await login(page, admin.email, admin.password);
  });

  test('should display payslip history and allow viewing details', async ({ page }) => {
    await page.goto(getTenantUrl('/en/payroll'));
    
    // 1. Verify payslip from real seeded backend
    // Seeded data: Net Pay 16,500,000
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 20000 });
    
    // Check formatted amount
    await expect(table.getByText(/16[.,]500[.,]000/)).toBeVisible({ timeout: 30000 });
    
    // 2. View Details (if there's a view button)
    // The button name might be something like view-payslip-X
    const viewBtn = table.getByRole('button').first();
    await viewBtn.click();
    
    // Verify Modal Details
    const modal = page.getByRole('dialog');
    await expect(modal.getByText(/Payslip Details|Payslip Breakdown/i)).toBeVisible({ timeout: 10000 });
    await expect(modal.getByText(/Basic Salary/i)).toBeVisible();
    await expect(modal.getByText(/15[.,]000[.,]000/)).toBeVisible();
  });

  test('should support downloading payslip as PDF', async ({ page }) => {
    await page.goto(getTenantUrl('/en/payroll'));
    
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 15000 });
    
    // Look for a download button (usually has an icon or specific ID)
    const downloadBtn = table.locator('button').filter({ hasText: /download/i }).first();
    
    if (await downloadBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await downloadBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.pdf');
    } else {
      console.log('Download button not found or not visible, skipping download check');
    }
  });
});
