import { test, expect } from '@playwright/test';

test.describe.serial('Admin Analytics Dashboard', () => {
  const adminUrl = 'http://company1.localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://company1.localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `analytics-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Intercept CSV export window.open
    await page.addInitScript(() => {
      (window as any).__exports = [];
      window.open = (url: string | URL | undefined, target?: string, features?: string) => {
        (window as any).__exports.push(url);
        return null;
      };
    });

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
        responseBody = { name: 'Company1', enabled_modules: ['analytics'], is_subscription_active: true };
      } else if (path.includes('/dashboard-stats')) {
        responseBody = {
          total_employees: 150,
          attendance_today: [
            { status: 'PRESENT', count: 140 },
            { status: 'LATE', count: 5 }
          ],
          department_distribution: [
            { name: 'Engineering', employee_count: 80 },
            { name: 'HR', employee_count: 10 }
          ],
          payroll_summary: {
            total_net_pay: 1500000000, // 1.5 Billion
            total_overtime: 50000000   // 50 Million
          },
          trends: {
            months: ['Jan', 'Feb', 'Mar'],
            headcount: [140, 145, 150]
          }
        };
      } else if (path.includes('/attendance/attendances/export_csv')) {
        await route.fulfill({ status: 200, contentType: 'text/csv', headers: corsHeaders, body: 'id,date,status\n1,2026-03-24,PRESENT' });
        return;
      }

      if (responseBody) {
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify([]) });
      }
    });

    await page.goto(`${adminUrl}/login`);
    await page.locator('input[type="email"]').fill('admin@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should render advanced analytics dashboard metrics and charts', async ({ page }) => {
    await page.goto(`${adminUrl}/analytics`);
    
    // Verify Dashboard Cards
    // Total Employees: 150
    await expect(page.getByText('150', { exact: true }).first()).toBeVisible();
    
    // Payroll: Rp 1500.0jt
    await expect(page.getByText('Rp 1500.0jt')).toBeVisible();
    
    // Overtime: Rp 50.0jt
    await expect(page.getByText('Rp 50.0jt')).toBeVisible();
    
    // Cost per Employee: 1.5M / 150 = 10,000,000 -> Rp 10.0jt
    await expect(page.getByText('Rp 10.0jt')).toBeVisible();

    // Verify Charts render sections
    await expect(page.getByText(/Staff Distribution/i)).toBeVisible();
  });

  test('should trigger CSV exports for attendance and performance', async ({ page }) => {
    await page.goto(`${adminUrl}/analytics`);
    
    // Wait for metrics to load
    await expect(page.getByText('150', { exact: true }).first()).toBeVisible();
    
    // Click Attendance Export
    await page.getByRole('button', { name: /Export Attendance/i }).click();
    
    // Verify window.open was called with correct URL
    const exports = await page.evaluate(() => (window as any).__exports);
    expect(exports[0]).toContain('/api/attendance/attendances/export_csv');

    // Click Performance Export
    await page.getByRole('button', { name: /Export Appraisals/i }).click();

    const exportsAfter = await page.evaluate(() => (window as any).__exports);
    expect(exportsAfter[1]).toContain('/api/performance/appraisals/export_csv');
  });
});
