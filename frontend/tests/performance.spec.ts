import { test, expect } from '@playwright/test';

test.describe('Performance & Appraisal Lifecycle', () => {
  const managerUrl = 'http://company1.localhost:3000';

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `performance-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route(/\/api\/.*/, async route => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': managerUrl, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken', 'Access-Control-Allow-Credentials': 'true' } });
        return;
      }

      if (url.match(/\/auth\/login\/?$/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 2, email: 'manager1@company1.net', role: 'MANAGER' }) });
        return;
      }
      if (url.match(/\/users\/me\/?$/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 2, email: 'manager1@company1.net', role: 'MANAGER', is_staff: false, fullname: 'Manager One' }) });
        return;
      }
      if (url.match(/\/employees\/?/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 10, email: 'manager1@company1.net' }]) });
        return;
      }
      if (url.match(/\/tenant\/settings\/?$/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'Company1', logo: null, theme_primary_color: '#6366f1', theme_secondary_color: '#4f46e5', is_subscription_active: true, enabled_modules: ['attendance', 'payroll', 'performance', 'reimbursement', 'leaves', 'analytics', 'workflows', 'audit_logs', 'api_keys', 'branding'] }) });
        return;
      }
      if (url.match(/\/kpi-targets\/?/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, kpi_name: "Quality of Work", target_value: 100, actual_value: 85, period: "2026-Q1" }]) });
        return;
      }
      if (url.match(/\/appraisals\/?/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 999, employee_name: "Employee 1", period_name: "2026-Q1", status: "SUBMITTED", start_date: "2026-01-01", end_date: "2026-03-31", reviews: [] }]) });
        return;
      }
      if (url.match(/\/appraisal-reviews\/?/)) {
        if (method === 'POST') { await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true }) }); return; }
      }
      await route.continue();
    });

    await page.goto(`${managerUrl}/login`);
    await page.locator('input[type="email"]').fill('manager1@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Wait for Sidebar
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should submit appraisal review and update dashboard', async ({ page }) => {
    await page.goto(`${managerUrl}/performance`);
    await expect(page.getByText(/Quality of Work/i)).toBeVisible();
    await page.locator('table tbody tr button').first().click();
    await page.locator('textarea').fill('Exceeded expectations in Q1.');
    await page.getByRole('button', { name: /Submit Score/i }).click();
    await expect(page.getByText(/Score submitted successfully/i)).toBeVisible();
  });
});
