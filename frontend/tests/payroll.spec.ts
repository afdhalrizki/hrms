import { test, expect } from '@playwright/test';

test.describe('Payroll Lifecycle', () => {
  const adminUrl = 'http://company1.localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Login as HR Admin
    await page.goto(`${adminUrl}/login`);
    await page.locator('input[type="email"]').fill('admin@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
  });

  test('should generate company-wide payroll for a period', async ({ page }) => {
    // Navigate to Payroll
    await page.goto(`${adminUrl}/payroll`);

    // Verify "Generate Payroll" button
    const generateBtn = page.getByRole('button', { name: /Generate Payroll/i });
    await expect(generateBtn).toBeVisible();

    // Open Modal
    await generateBtn.click();
    await expect(page.getByText(/Bulk Generate Payroll/i)).toBeVisible();

    // Select current month (default) and submit
    await page.getByRole('button', { name: /Process/i }).click();

    // Verify Success Notification
    await expect(page.getByText(/Payroll generated successfully/i)).toBeVisible();

    // Verify one payslip appears in the list
    await expect(page.locator('table >> tbody >> tr').first()).toBeVisible();
  });

  test('should allow viewing payslip details', async ({ page }) => {
    await page.goto(`${adminUrl}/payroll`);
    
    // Click "View" on the first payslip
    const viewBtn = page.locator('button[aria-label="View payslip"]').first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // Verify Modal Details (Earnings, Deductions)
    await expect(page.getByText(/Payslip Details/i)).toBeVisible();
    await expect(page.getByText(/Basic Salary/i)).toBeVisible();
    await expect(page.getByText(/PPh 21/i)).toBeVisible();
  });
});
