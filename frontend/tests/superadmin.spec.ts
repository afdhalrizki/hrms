import { test, expect } from '@playwright/test';

test.describe.serial('Superadmin Registration Management', () => {
  const superadminUrl = 'http://localhost:3000'; // Superadmin typically runs on the main domain or a specific port

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `superadmin-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
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
        responseBody = { id: 0, email: 'superadmin@harikerja.com', role: 'SUPERADMIN', is_staff: true, fullname: 'Super Admin' };
      } else if (path.includes('/users/me')) {
        responseBody = { id: 0, email: 'superadmin@harikerja.com', role: 'SUPERADMIN', is_staff: true, fullname: 'Super Admin' };
      } else if (path.includes('/tenant/settings')) {
        // Superadmin domain might not have specific tenant settings or might return a default
        responseBody = { name: 'Hari Kerja Platform', enabled_modules: ['admin_registrations'], is_subscription_active: true };
      } else if (path.includes('/internal/registrations')) {
        if (path.endsWith('/approve') || path.endsWith('/reject')) {
          responseBody = { success: true };
        } else {
          responseBody = [
            { id: 1, company_name: 'Pending Corp', subdomain_prefix: 'pending', admin_email: 'admin@pending.com', status: 'PENDING', created_at: '2026-03-24T00:00:00Z' },
            { id: 2, company_name: 'Approved Inc', subdomain_prefix: 'approved', admin_email: 'admin@approved.com', status: 'APPROVED', created_at: '2026-03-24T00:00:00Z' }
          ];
        }
      }

      if (responseBody) {
        await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(responseBody) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify([]) });
      }
    });

    // Login as Superadmin
    await page.goto(`${superadminUrl}/login/portal-admin`);
    await page.locator('input[type="email"]').fill('superadmin@harikerja.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 15000 });
  });

  test('should allow superadmin to review and approve registration requests', async ({ page }) => {
    await page.goto(`${superadminUrl}/admin/registrations`);
    
    // 1. Verify Header and Stats
    await expect(page.getByRole('heading', { name: /Registration Requests/i })).toBeVisible();
    await expect(page.getByText('Total Requests')).toBeVisible();
    // In our mock: 1 pending, 1 approved -> Total 2
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible();

    // 2. Verify List Content
    await expect(page.getByText('Pending Corp')).toBeVisible();
    await expect(page.getByText('Approved Inc')).toBeVisible();

    // 3. Perform Approve Action
    const pendingRow = page.locator('tr').filter({ hasText: 'Pending Corp' });
    const approveBtn = pendingRow.getByRole('button', { name: /Approve/i });
    
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // UI should trigger a refresh (in mock it just stays but we verify the click worked and didn't crash)
    // In a real environment, the status would change. 
    // We can verify the button becomes disabled or hidden if the UI logic handles it immediately.
  });

  test('should allow superadmin to reject registration requests', async ({ page }) => {
    await page.goto(`${superadminUrl}/admin/registrations`);
    
    const pendingRow = page.locator('tr').filter({ hasText: 'Pending Corp' });
    const rejectBtn = pendingRow.getByRole('button', { name: /Reject/i });
    
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();
  });
});
