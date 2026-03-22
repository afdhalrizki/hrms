import { test, expect } from '@playwright/test';

test.describe('Branding and Identity', () => {
  const adminUrl = 'http://company1.localhost:3000';

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `branding-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.route(/\/api\/.*/, async route => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': adminUrl, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken', 'Access-Control-Allow-Credentials': 'true' } });
        return;
      }

      if (url.match(/\/auth\/login\/?/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, email: 'admin@company1.net', role: 'ADMIN' }) });
        return;
      }
      if (url.match(/\/users\/me\/?/)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, email: 'admin@company1.net', role: 'ADMIN', is_staff: true, fullname: 'Admin User' }) });
        return;
      }
      if (url.match(/\/tenant\/settings\/?/)) {
        if (method === 'PATCH') { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }); return; }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'Company1', logo: null, theme_primary_color: '#6366f1', theme_secondary_color: '#4f46e5', is_subscription_active: true, enabled_modules: ['attendance', 'payroll', 'performance', 'reimbursement', 'leaves', 'analytics', 'workflows', 'audit_logs', 'api_keys', 'branding'] }) });
        return;
      }
      await route.continue();
    });

    await page.goto(`${adminUrl}/login`);
    await page.locator('input[type="email"]').fill('admin@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Wait for Sidebar
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should update company branding and apply theme instantly', async ({ page }) => {
    await page.goto(`${adminUrl}/settings/branding`);
    await expect(page.getByText(/Tenant Branding/i)).toBeVisible();
    await page.locator('input[type="color"]').first().fill('#ff0000');
    await page.getByRole('button', { name: /Apply Changes/i }).click();
    await expect(page.getByText(/Branding updated successfully/i)).toBeVisible();
  });
});
