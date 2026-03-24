import { test, expect } from '@playwright/test';

test.describe.serial('Reimbursement Management', () => {
  const employeeUrl = 'http://company1.localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `reimbursements-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
    await page.on('request', request => console.log(`[REQUEST] ${request.method()} ${request.url()}`));
    await page.on('requestfailed', request => console.log(`FAILED REQUEST: ${request.method()} ${request.url()} [${request.failure()?.errorText}]`));

    await page.route(url => url.pathname.includes('/api/'), async route => {
      const method = route.request().method();
      const url = new URL(route.request().url());
      const path = url.pathname;
      
      console.log(`INTERCEPTED: ${method} ${path}`);

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
        responseBody = { name: 'Company1', enabled_modules: ['attendance', 'reimbursement'], is_subscription_active: true };
      } else if (path.includes('/reimbursement-categories')) {
        responseBody = [{ id: 1, name: 'Transport', max_amount: '500000.00' }];
      } else if (path.includes('/reimbursements')) {
        if (method === 'GET') {
          responseBody = [
            { id: 1, category: { name: 'Transport' }, date: '2026-03-20', amount: '150000.00', status: 'PENDING', description: 'Business Trip Uber' }
          ];
        } else {
          console.log(`MOCKING POST RESPONSE FOR ${path}`);
          responseBody = { id: 2, status: 'PENDING' };
          status = 201;
        }
      }

      if (responseBody) {
        console.log(`FULFILLING: ${method} ${path} with ${status}`);
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        console.log(`FALLBACK: ${method} ${path}`);
        await route.continue();
      }
    });

    await page.goto(`${employeeUrl}/login`);
    await page.locator('input[type="email"]').fill('employee1@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should verify reimbursement history and submit a new claim', async ({ page }) => {
    await page.goto(`${employeeUrl}/reimbursements`);
    await page.waitForLoadState('networkidle');
    
    // 1. Verify History
    await expect(page.locator('table').getByText(/Business Trip Uber/i)).toBeVisible({ timeout: 15000 });
    
    // 2. Open Modal and Submit Claim
    await page.getByRole('button', { name: /New Reimbursement Claim/i }).click();
    await expect(page.getByRole('heading', { name: /New Reimbursement Claim/i })).toBeVisible({ timeout: 10000 });
    
    await page.locator('input[type="number"]').fill('200000');
    await page.getByPlaceholder(/Justification/i).fill('Team Dinner reimbursement for Q1 celebration.');
    
    const categorySelect = page.locator('select#category');
    // Wait for the option to be populated from the mocked API
    await expect(categorySelect.locator('option').filter({ hasText: 'Transport' })).toBeAttached({ timeout: 15000 });
    await categorySelect.selectOption({ label: 'Transport' });
    
    const form = page.getByTestId('reimbursement-form');
    await form.evaluate(node => (node as HTMLFormElement).requestSubmit());
    
    await expect(page.getByText(/Reimbursement claim submitted successfully!/i)).toBeVisible({ timeout: 15000 });
  });
});
