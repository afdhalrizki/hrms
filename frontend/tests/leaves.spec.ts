import { test, expect } from '@playwright/test';

test.describe.serial('Leaves Management', () => {
  const employeeUrl = 'http://company1.localhost:3000';

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `leaves-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', async route => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': employeeUrl, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken', 'Access-Control-Allow-Credentials': 'true' } });
        return;
      }

      if (url.includes('/auth/login')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 2, email: 'employee1@company1.net', role: 'EMPLOYEE' }) });
        return;
      }
      if (url.includes('/users/me')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 2, email: 'employee1@company1.net', role: 'EMPLOYEE', is_staff: false, fullname: 'Employee One' }) });
        return;
      }
      if (url.includes('/tenant/settings')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'Company1', enabled_modules: ['attendance', 'leaves'], is_subscription_active: true }) });
        return;
      }
      if (url.match(/\/leave-balances\/?/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ year: 2026, total_days: '12.0', used_days: '2.0', remaining_days: '10.0' }]) });
        return;
      }
      if (url.match(/\/leave-requests\/?/)) {
        if (method === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
            { id: 1, leave_type: 'CUTI', start_date: '2026-03-01', end_date: '2026-03-02', reason: 'Vacation Trip', status: 'APPROVED', created_at: '2026-02-15' }
          ]) });
        } else {
          await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 2, status: 'PENDING' }) });
        }
        return;
      }
      await route.continue();
    });

    await page.goto(`${employeeUrl}/login`);
    await page.locator('input[type="email"]').fill('employee1@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should display leave balances and history', async ({ page }) => {
    await page.goto(`${employeeUrl}/leaves`);
    
    // Check remaining days
    await expect(page.getByText('10')).toBeVisible();
    
    // Check history
    await expect(page.getByText('Vacation Trip')).toBeVisible();
    await expect(page.getByText('APPROVED')).toBeVisible();
  });

  test('should submit a new leave request', async ({ page }) => {
    await page.goto(`${employeeUrl}/leaves`);
    
    // Wait for table to load
    const table = page.locator('table');
    await expect(table.getByText(/Vacation Trip/i)).toBeVisible({ timeout: 10000 });
    
    // Check balances
    await expect(page.getByText('10').first()).toBeVisible();
    await expect(table.getByText(/APPROVED/i).first()).toBeVisible();
    
    await page.getByRole('button', { name: /Request Leave/i }).click();
    await expect(page.getByPlaceholder(/Briefly explain your reason/i)).toBeVisible();
    
    // Fill form
    await page.locator('textarea').fill('Family vacation planning.');
    
    // Submit
    await page.getByRole('button', { name: /Submit/i }).last().click();
    
    // Verify success toast
    await expect(page.getByText(/Leave request submitted successfully!/i)).toBeVisible();
  });
});
