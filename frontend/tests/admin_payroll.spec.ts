import { test, expect } from '@playwright/test';

test.describe.serial('Admin Payroll Management', () => {
  const adminUrl = 'http://company1.localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://company1.localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `admin-payroll-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/*', async route => {
      const urlStr = route.request().url();
      if (!urlStr.includes('/api/')) {
        await route.continue();
        return;
      }
      
      const method = route.request().method();
      const url = new URL(urlStr);
      const path = url.pathname;
      
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      let responseBody: any = null;
      let status = 200;

      if (path.includes('/auth/login')) {
        responseBody = { id: 1, email: 'admin@company1.net', role: 'ADMIN', fullname: 'Admin User', is_staff: true };
      } else if (path.includes('/users/me')) {
        responseBody = { id: 1, email: 'admin@company1.net', role: 'ADMIN', is_staff: true, fullname: 'Admin User' };
      } else if (path.includes('/tenant/settings')) {
        responseBody = { name: 'Company1', enabled_modules: ['payroll'], is_subscription_active: true };
      } else if (path.includes('/payroll-periods')) {
        responseBody = [
          { id: 1, month: 3, year: 2026, is_closed: false }
        ];
      } else if (path.includes('/payslips/generate')) {
        responseBody = { success: true, count: 5 };
        status = 201;
      } else if (path.includes('/payslips')) {
        responseBody = [
          { id: 1, employee_name: 'John Doe', period_display: 'March 2026', basic_salary: "10000000.00", net_pay: "11500000.00", pph21_tax: "500000.00", status: "PENDING", details: [] }
        ];
      }

      if (responseBody) {
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${adminUrl}/login`);
    await page.locator('input[type="email"]').fill('admin@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should allow admin to generate payroll for a period', async ({ page }) => {
    await page.goto(`${adminUrl}/payroll`);
    
    // 1. Verify Stats are visible (using .first() to avoid strict mode violations if multiple)
    await expect(page.getByText('Rp 11,500,000').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Rp 500,000').first()).toBeVisible();

    // 2. Open Run Payroll Modal
    const runBtn = page.getByRole('button', { name: /Generate Payroll/i });
    await expect(runBtn).toBeVisible({ timeout: 15000 });
    await runBtn.click({ force: true });
    
    // 3. Select Period and Generate
    await expect(page.getByRole('heading', { name: /Bulk Generate Payroll/i })).toBeVisible({ timeout: 15000 });
    
    // The button contains the month name "March 2026"
    const periodBtn = page.getByRole('button', { name: /March 2026/i }).first();
    await expect(periodBtn).toBeVisible();
    await periodBtn.click({ force: true });
    
    // Click Generate Button (translated as "Process")
    const processBtn = page.getByRole('button', { name: /Process/i });
    await expect(processBtn).toBeVisible();
    await processBtn.click({ force: true });

    // 4. Verify Toast/Success
    await expect(page.getByText(/Payroll generated successfully/i)).toBeVisible();
  });

  test('should allow admin to view payslip details', async ({ page }) => {
    await page.goto(`${adminUrl}/payroll`);
    
    // Find the view button in the table row
    const row = page.locator('tr').filter({ hasText: 'John Doe' });
    await row.getByRole('button', { name: /view-payslip-1/i }).click({ force: true });

    // Verify Modal Details
    // Using locator for h2 to be more specific and waiting for animation
    const breakdownHeading = page.locator('h2').filter({ hasText: /Payslip Breakdown/i });
    await expect(breakdownHeading).toBeVisible({ timeout: 15000 });
    
    await expect(page.getByText('John Doe').first()).toBeVisible();
    await expect(page.getByText('Basic Salary').first()).toBeVisible();
  });
});
