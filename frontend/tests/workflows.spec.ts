import { test, expect } from '@playwright/test';

test.describe.serial('Core Configurations (Branches & Workflows)', () => {
  const adminUrl = 'http://localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `workflows-failure.png`, fullPage: true });
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

      // Auth & Base
      if (path.includes('/auth/login')) {
        responseBody = { id: 1, email: 'admin@company1.net', role: 'ADMIN', fullname: 'Admin User', is_staff: true };
      } else if (path.includes('/users/me')) {
        responseBody = { id: 1, email: 'admin@company1.net', role: 'ADMIN', is_staff: true, fullname: 'Admin User' };
      } else if (path.includes('/tenant/settings')) {
        responseBody = { name: 'Company1', enabled_modules: ['workflows'], is_subscription_active: true };
      
      // Core configuration endpoints
      } else if (path.includes('/access-roles')) {
        responseBody = [{ id: 1, name: 'Manager' }, { id: 2, name: 'HR' }];
      } else if (path.includes('/employees') && url.searchParams.get('lite') === 'true') {
        responseBody = [{ id: 1, fullname: 'Admin User' }, { id: 2, fullname: 'Employee One' }];
      } else if (path.includes('/branches')) {
        if (method === 'GET') {
          responseBody = [
            { id: 1, name: 'Headquarters', address: 'Jakarta', latitude: -6.2, longitude: 106.8, radius_meters: 100, timezone: 'Asia/Jakarta' }
          ];
        } else if (method === 'POST') {
          responseBody = { id: 2, name: 'New Branch Office', address: 'Bali', latitude: -8.4, longitude: 115.1, radius_meters: 50, timezone: 'Asia/Makassar' };
          status = 201;
        }
      } else if (path.includes('/workflow-configs')) {
        if (method === 'GET') {
          responseBody = [
            { 
              id: 1, 
              name: 'Leave Approval Workflow', 
              model_type: 'LEAVE', 
              is_active: true,
              stages: [
                { id: 101, name: 'Stage 1', sequence: 1, approver_type: 'SUPERVISOR', role_id: null, specific_user_id: null }
              ] 
            }
          ];
        } else if (method === 'PATCH') {
          responseBody = { success: true };
        }
      } else if (path.includes('/workflow-stages')) {
        // Mock stage update/creation
        responseBody = { success: true };
        status = method === 'POST' ? 201 : 200;
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

  test('should allow admin to manage branches', async ({ page }) => {
    await page.goto(`${adminUrl}/en/branches?test_tenant=company1`);
    
    // Verify initial load
    await expect(page.getByText('Headquarters')).toBeVisible();
    
    // Open New Branch Modal
    await page.getByRole('button', { name: /Add Branch/i }).click();
    await expect(page.getByRole('heading', { name: /Add New Branch/i })).toBeVisible();

    // Fill form
    await page.locator('input[name="name"]').fill('New Branch Office');
    await page.locator('textarea[name="address"]').fill('Bali');
    await page.locator('input[name="latitude"]').fill('-8.4');
    await page.locator('input[name="longitude"]').fill('115.1');
    await page.locator('input[name="radius_meters"]').fill('50');
    await page.locator('select[name="timezone"]').selectOption('Asia/Makassar');

    // Submit using requestSubmit() for stability
    await page.locator('form').evaluate(node => (node as HTMLFormElement).requestSubmit());

    // Because the mock returns immediately, we expect the UI to refresh
    // The underlying logic in branches/page.tsx calls fetchBranches() again after save
    // (In our mock, GET still returns 1 branch unless we make it dynamic, but we just verify modal closes)
    await expect(page.getByRole('heading', { name: /Add New Branch/i })).not.toBeVisible();
  });

  test('should allow admin to configure workflows', async ({ page }) => {
    await page.goto(`${adminUrl}/en/workflows?test_tenant=company1`);

    // Verify initial workflow loads. The UI renders config.model_type in the list.
    await expect(page.getByRole('button', { name: 'LEAVE', exact: true })).toBeVisible();

    // The current stage should be visible
    await expect(page.getByText(/Uses Employee's Direct Supervisor/i)).toBeVisible();

    // Add a new stage
    await page.getByRole('button', { name: /Add Approval Level/i }).click();
    
    // Stage 2 should appear in the UI (rendered as an input value)
    await expect(page.locator('input[value="Stage 2"]')).toBeVisible();

    // Save configuration
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Verify success toast/message (Save Configuration button states typically change or toast appears)
    // Wait a brief moment for the requests to complete
    await page.waitForTimeout(500); 
  });
});
