import { test, expect } from '@playwright/test';

test.describe.serial('Performance & Appraisal Lifecycle', () => {
  const employeeUrl = 'http://company1.localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `performance-failure.png`, fullPage: true });
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
      } else if (path.includes('/core/employees')) {
        responseBody = [{ id: 99, email: 'employee1@company1.net', fullname: 'Employee One' }];
      } else if (path.includes('/tenant/settings')) {
        responseBody = { name: 'Company1', enabled_modules: ['performance'], is_subscription_active: true };
      } else if (path.includes('/kpi-targets')) {
        responseBody = [{ id: 1, kpi_name: "Quality of Work", target_value: 100, actual_value: 85, period: "2026-Q1" }];
      } else if (path.includes('/appraisal-reviews')) {
        if (method === 'POST') {
          responseBody = { success: true };
          status = 201;
        }
      } else if (path.includes('/appraisals')) {
        responseBody = [
          { 
            id: 999, 
            employee_name: "Employee 1", 
            period_name: "2026-Q1", 
            status: "SUBMITTED", 
            start_date: "2026-01-01", 
            end_date: "2026-03-31", 
            reviews: [
              { id: 1, reviewer_type: 'SELF', reviewer_name: 'Employee 1', ratings: { quality: 4, communication: 4, reliability: 4, teamwork: 4 }, comments: 'Good job' }
            ] 
          }
        ];
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

  test('should verify KPI dashboard and submit an appraisal review', async ({ page }) => {
    await page.goto(`${employeeUrl}/performance`);
    
    // 1. Check Dashboard Stats
    await expect(page.getByText(/Quality of Work/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('85%')).toBeVisible();
    
    // 2. Open Modal and Submit Review
    const perfBtn = page.locator('table').getByRole('button', { name: /PERFORMANCE/i }).first();
    await expect(perfBtn).toBeVisible({ timeout: 10000 });
    await perfBtn.click();

    await expect(page.getByText(/Submit Performance Review/i)).toBeVisible({ timeout: 30000 });

    const qualitySection = page.getByText(/Quality of Work/i).locator('..').first();
    const starBtn = qualitySection.locator('button').nth(4);
    await starBtn.scrollIntoViewIfNeeded();
    await starBtn.click({ force: true });

    await page.locator('textarea').fill('Employee 1 has shown exceptional progress in the current period.');
    
    const submitBtn = page.getByRole('button', { name: /Submit Score/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });
    
    await expect(page.getByText(/Score submitted successfully/i).first()).toBeVisible({ timeout: 30000 });
  });
});
