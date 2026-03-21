import { test, expect } from '@playwright/test';

test.describe.serial('Attendance Lifecycle', () => {
  const tenantUrl = 'http://company1.localhost:3000';

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `attendance-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Ultimate Mock: Catch EVERYTHING under /api/
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': tenantUrl,
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
            'Access-Control-Allow-Credentials': 'true'
          }
        });
        return;
      }

      // Default responses for common endpoints
      if (url.includes('/auth/login')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 2, role: 'EMPLOYEE' }) });
      } else if (url.includes('/users/me')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 2, role: 'EMPLOYEE', employee_id: 10, fullname: 'Employee One' }) });
      } else if (url.includes('/tenant/settings')) {
        await route.fulfill({ 
          status: 200, 
          contentType: 'application/json', 
          body: JSON.stringify({
            name: 'Company1',
            enabled_modules: ['attendance', 'payroll', 'performance', 'reimbursement', 'leaves', 'analytics', 'workflows', 'audit_logs', 'api_keys', 'branding'],
            is_subscription_active: true
          }) 
        });
      } else if (url.match(/\/api\/?$/)) { // Attendance page hits root /api/
         if (method === 'GET') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
         } else if (method === 'POST') {
            await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 101, date: new Date().toISOString().split('T')[0], check_in: '09:00:00', status: 'PRESENT' }) });
         }
      } else {
        // Fallback for any other /api/** calls to prevent "Failed to fetch"
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    await page.goto(`${tenantUrl}/login`);
    await page.locator('input[type="email"]').fill('employee1@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should perform daily check-in successfully', async ({ page }) => {
    await page.goto(`${tenantUrl}/attendance`);
    const checkInBtn = page.getByRole('button', { name: /Check In/i });
    await expect(checkInBtn).toBeVisible();
    await checkInBtn.click();
    await expect(page.getByText(/Attendance recorded successfully/i)).toBeVisible();
  });

  test('should display daily shift summary', async ({ page }) => {
    await page.goto(`${tenantUrl}/attendance`);
    await expect(page.getByText(/Success Rate/i)).toBeVisible();
  });
});
