import { test, expect } from '@playwright/test';

test.describe.serial('Payroll Lifecycle', () => {
  const adminUrl = 'http://company1.localhost:3000';

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `payroll-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', async route => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': adminUrl, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken', 'Access-Control-Allow-Credentials': 'true' } });
        return;
      }

      if (url.includes('/auth/login')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, email: 'admin@company1.net', role: 'ADMIN' }) });
      } else if (url.includes('/users/me')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, email: 'admin@company1.net', role: 'ADMIN', is_staff: true, fullname: 'Admin User' }) });
      } else if (url.includes('/tenant/settings')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'Company1', is_subscription_active: true, enabled_modules: ['attendance', 'payroll', 'performance', 'reimbursement', 'leaves', 'analytics', 'workflows', 'audit_logs', 'api_keys', 'branding'] }) });
      } else if (url.includes('/payroll-periods')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, month: 3, year: 2026, is_closed: false }]) });
      } else if (url.includes('/payslips/generate')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, total_generated: 1 }) });
      } else if (url.includes('/payslips')) {
        if (method === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
            { id: 999, employee_name: 'Employee One', period_display: 'March 2026', basic_salary: '10000000', net_pay: '9500000', status: 'DRAFT', pph21_tax: '500000', details: [{ id: 1, description: 'Basic Salary', amount: '10000000', is_deduction: false }] }
          ]) });
        } else {
           await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        }
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.goto(`${adminUrl}/login`);
    await page.locator('input[type="email"]').fill('admin@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should run entire payroll generation flow', async ({ page }) => {
    await page.goto(`${adminUrl}/payroll`);
    await page.getByRole('button', { name: /Generate Payroll/i }).click();
    
    const periodBtn = page.getByRole('button', { name: /March 2026/i });
    await expect(periodBtn).toBeVisible();
    await periodBtn.click();

    const processBtn = page.getByRole('button', { name: /Process/i });
    await expect(processBtn).toBeVisible();
    await processBtn.click();

    await expect(page.getByText(/Payroll generated successfully/i)).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('should allow viewing payslip details', async ({ page }) => {
    await page.goto(`${adminUrl}/payroll`);
    await page.locator('button[aria-label^="view-payslip"]').first().click();
    await expect(page.getByRole('heading', { name: /Payslip Breakdown/i })).toBeVisible({ timeout: 10000 });
  });
});
