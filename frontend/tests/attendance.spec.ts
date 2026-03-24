import { test, expect } from '@playwright/test';

test.describe.serial('Attendance Management', () => {
  const tenantUrl = 'http://company1.localhost:3000';
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://company1.localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `attendance-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/*', async route => {
      const urlStr = route.request().url();
      if (!urlStr.includes('/api/')) {
        await route.continue();
        return;
      }
      
      const url = new URL(urlStr);
      const path = url.pathname;
      const method = route.request().method();
      
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      let responseBody: any = null;
      let status = 200;

      if (path.includes('/auth/login')) {
        responseBody = { id: 2, email: 'employee1@company1.net', role: 'EMPLOYEE', fullname: 'Employee One', is_staff: false };
      } else if (path.includes('/users/me')) {
        responseBody = { id: 2, email: 'employee1@company1.net', role: 'EMPLOYEE', is_staff: false, fullname: 'Employee One' };
      } else if (path.includes('/tenant/settings')) {
        responseBody = { name: 'Company1', enabled_modules: ['attendance'], is_subscription_active: true };
      } else if (path.includes('/attendance-correction-requests')) {
        if (method === 'POST') {
          responseBody = { id: 10, status: 'PENDING' };
          status = 201;
        }
      } else if (path.includes('/attendance')) {
        const today = new Date().toISOString().split('T')[0];
        if (method === 'GET') {
          responseBody = [
            { id: 1, employee_name: 'Employee One', date: today, check_in: "09:00", check_out: null, status: "PRESENT", liveness_verified: true, verification_method: 'LIVENESS' }
          ];
        } else {
          responseBody = { id: 1, employee_name: 'Employee One', date: today, check_in: "09:00", check_out: "17:00", status: "PRESENT", liveness_verified: true, verification_method: 'LIVENESS' };
          status = 201;
        }
      }

      if (responseBody) {
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify([]) });
      }
    });

    await page.goto(`${tenantUrl}/login`);
    await page.locator('input[type="email"]').fill('employee1@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Workspace Portal/i)).toBeVisible({ timeout: 15000 });
  });

  test('should verify attendance dashboard and perform actions', async ({ page }) => {
    await page.goto(`${tenantUrl}/attendance`);
    await page.waitForLoadState('networkidle');
    
    // 1. Verify Stats
    const successRateCard = page.getByText(/Success Rate/i);
    await expect(successRateCard).toBeVisible({ timeout: 15000 });
    
    // 2. Perform Check Out
    const checkOutBtn = page.getByRole('button', { name: /Check Out/i });
    await expect(checkOutBtn).toBeVisible({ timeout: 10000 });
    await checkOutBtn.click();
    await expect(page.getByText(/Attendance recorded successfully/i)).toBeVisible({ timeout: 10000 });

    // 3. Submit Correction Request
    const requestCorrectionBtn = page.getByRole('button', { name: /Request Correction/i }).first();
    await requestCorrectionBtn.click();
    await expect(page.getByRole('heading', { name: /Request Correction/i })).toBeVisible();
    await page.locator('textarea').fill('Forgot to check in due to morning meeting.');
    
    // Use requestSubmit for reliability
    await page.locator('form').evaluate(node => (node as HTMLFormElement).requestSubmit());
    await expect(page.getByText(/Correction request submitted successfully!/i)).toBeVisible();
  });
});
