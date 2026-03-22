import { test, expect } from '@playwright/test';

test.describe.serial('Payroll Management', () => {
  const employeeUrl = 'http://company1.localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `payroll-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route(url => url.href.includes('api'), async route => {
      const method = route.request().method();
      const url = new URL(route.request().url());
      const path = url.pathname;
      
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      let responseBody: any = null;
      let status = 200;

      if (path.includes('/auth/login')) {
        responseBody = { id: 2, email: 'employee1@company1.net', role: 'EMPLOYEE', fullname: 'Employee One' };
      } else if (path.includes('/users/me')) {
        responseBody = { id: 2, email: 'employee1@company1.net', role: 'EMPLOYEE', is_staff: false, fullname: 'Employee One' };
      } else if (path.includes('/tenant/settings')) {
        responseBody = { name: 'Company1', enabled_modules: ['attendance', 'payroll'], is_subscription_active: true };
      } else if (path.includes('/payslips')) {
        responseBody = [
          { id: 1, employee_name: 'Employee One', period_display: 'March 2026', basic_salary: "10000000.00", allowance: "2000000.00", deductions: "500000.00", net_pay: "11500000.00", status: "PAID", created_at: "2026-03-25", details: [] }
        ];
      } else if (path.includes('/download_pdf/')) {
        await route.fulfill({ status: 200, contentType: 'application/pdf', headers: corsHeaders, body: Buffer.from('%PDF-1.4 test') });
        return;
      }

      if (responseBody) {
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify([]) });
      }
    });

    await page.goto(`${employeeUrl}/login`);
    await page.locator('input[type="email"]').fill('employee1@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should display payslip history and detailed content', async ({ page }) => {
    await page.goto(`${employeeUrl}/payroll`);
    
    // Check that the history table contains our mock data
    const table = page.locator('table');
    await expect(table.getByText(/March 2026/i)).toBeVisible({ timeout: 30000 });
    await expect(table.getByText(/Employee One/i)).toBeVisible();
    
    // Check amounts (scoped to table)
    await expect(table.getByText('11,500,000')).toBeVisible();
    await expect(table.getByText(/PAID/i).first()).toBeVisible();
    
    // Download PDF (Verify download starts)
    const downloadPromise = page.waitForEvent('download');
    await table.getByRole('button', { name: /view-payslip-1/i }).click({ force: true, timeout: 30000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
