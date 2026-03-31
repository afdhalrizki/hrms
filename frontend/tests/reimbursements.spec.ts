import { test, expect } from '@playwright/test';

test.describe.serial('Reimbursement Management', () => {
  const employeeUrl = 'http://localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
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

    await page.context().route('**/*', async route => {
      const urlStr = route.request().url();
      if (!urlStr.toLowerCase().includes('api')) {
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

      if (urlStr.includes('/auth/login')) {
        responseBody = { id: 2, email: 'employee1@company1.net', role: 'EMPLOYEE', fullname: 'Employee One', is_staff: false };
      } else if (urlStr.includes('/users/me')) {
        responseBody = { id: 2, email: 'employee1@company1.net', role: 'EMPLOYEE', is_staff: false, fullname: 'Employee One' };
      } else if (urlStr.includes('/tenant/settings')) {
        responseBody = { name: 'Company1', enabled_modules: ['attendance', 'reimbursement'], is_subscription_active: true };
      } else if (urlStr.includes('/reimbursement-categories')) {
        responseBody = [{ id: 1, name: 'Transport', max_amount: '500000.00' }];
      } else if (urlStr.includes('/reimbursements')) {
        if (method === 'GET') {
          responseBody = [
            { id: 1, category: { name: 'Transport' }, date: '2026-03-20', amount: '150000.00', status: 'PENDING', description: 'Business Trip Uber' }
          ];
        } else {
          responseBody = { id: 2, status: 'PENDING' };
          status = 201;
        }
      }

      if (responseBody) {
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify([]) });
      }
    });

    await page.goto(`${employeeUrl}/en/login?test_tenant=company1`);
    await page.locator('input[type="email"]').fill('employee1@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should verify reimbursement history and submit a new claim', async ({ page }) => {
    const reimbursementUrl = `${employeeUrl}/en/reimbursements?test_tenant=company1`;
    let attempt = 0;
    while (attempt < 3) {
      try {
        attempt++;
        await page.goto(reimbursementUrl, { waitUntil: 'networkidle', timeout: 120000 });
        break;
      } catch (err) {
        console.warn(`reimbursement spec: navigation attempt ${attempt} failed: ${err}`);
        if (attempt >= 3) {
          throw err;
        }
        await page.waitForTimeout(3000);
      }
    }

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
