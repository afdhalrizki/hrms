import { test, expect } from '@playwright/test';

test.describe.serial('Employee Management', () => {
  const adminUrl = 'http://localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `employees-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/*', async route => {
      const urlStr = route.request().url();
      if (!urlStr.toLowerCase().includes('api')) {
        await route.continue();
        return;
      }
      
      const method = route.request().method();
      const url = route.request().url();
      
      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      const cleanUrl = url.split('?')[0];
      let responseBody: any = null;
      let status = 200;

      if (cleanUrl.match(/\/auth\/login\/?$/)) {
        responseBody = { id: 1, email: 'admin@company1.net', role: 'ADMIN', fullname: 'Admin User', is_staff: true };
      } else if (cleanUrl.match(/\/users\/me\/?$/)) {
        responseBody = { id: 1, email: 'admin@company1.net', role: 'ADMIN', is_staff: true, fullname: 'Admin User' };
      } else if (cleanUrl.match(/\/tenant\/settings\/?$/)) {
        responseBody = { name: 'Company1', enabled_modules: ['attendance', 'payroll', 'performance', 'reimbursement', 'leaves', 'branding'], is_subscription_active: true };
      } else if (cleanUrl.match(/\/departments\/?/)) {
        responseBody = [{ id: 1, name: 'Engineering' }];
      } else if (cleanUrl.match(/\/roles\/?/)) {
        responseBody = [{ id: 1, name: 'Senior Developer' }];
      } else if (cleanUrl.match(/\/golongan\/?/)) {
        responseBody = [{ id: 1, name: '3A' }];
      } else if (cleanUrl.match(/\/access-roles\/?/)) {
        responseBody = [{ id: 1, name: 'Employee' }];
      } else if (cleanUrl.match(/\/employees\/?/)) {
        if (method === 'GET') {
          responseBody = [
            { id: 101, nik: 'EMP001', fullname: 'John Doe', email: 'john@example.com', status: 'PERMANENT', department_name: 'Engineering', role_name: 'Senior Developer' }
          ];
        } else {
          responseBody = { id: 102, fullname: 'Jane Smith' };
          status = 201;
        }
      }

      if (responseBody) {
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify([]) });
      }
    });

    await page.goto(`${adminUrl}/en/login?test_tenant=company1`);
    await page.locator('input[type="email"]').fill('admin@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should display employee list and support searching', async ({ page }) => {
    await page.goto(`${adminUrl}/en/employees?test_tenant=company1`);
    await expect(page.getByText('John Doe')).toBeVisible({ timeout: 15000 });
    
    const searchInput = page.getByPlaceholder(/Search by name/i);
    await searchInput.fill('John');
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('should provision a new employee successfully', async ({ page }) => {
    await page.goto(`${adminUrl}/en/employees?test_tenant=company1`);
    await page.getByRole('button', { name: /Add Employee/i }).click();
    await expect(page.getByText(/Provision New Employee/i)).toBeVisible({ timeout: 15000 });
    
    await page.locator('input[name="fullname"]').fill('Jane Smith');
    await page.locator('input[name="nik"]').fill('EMP002');
    await page.locator('input[name="email"]').fill('jane@example.com');
    await page.locator('input[name="ktp_number"]').fill('1234567890123456');
    
    await page.locator('select[name="department"]').selectOption({ label: 'Engineering' });
    await page.locator('select[name="role"]').selectOption({ label: 'Senior Developer' });
    await page.locator('select[name="golongan"]').selectOption({ label: '3A' });
    await page.locator('select[name="access_role"]').selectOption({ label: 'Employee' });
    
    await page.getByRole('button', { name: /Provision Employee/i }).click();
    await expect(page.getByText(/Provision New Employee/i)).not.toBeVisible({ timeout: 15000 });
  });
});
