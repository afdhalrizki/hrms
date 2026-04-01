import { test, expect } from '@playwright/test';

test.describe('Branch Management', () => {
  const adminUrl = 'http://localhost:3000';

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRFToken',
    'Access-Control-Allow-Credentials': 'true'
  };

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `branches-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    let mockBranches = [
      { id: 'b1', name: 'Jakarta Office', address: 'Jl. Sudirman No. 1', latitude: -6.2088, longitude: 106.8456, radius_meters: 100, timezone: 'Asia/Jakarta' },
      { id: 'b2', name: 'Bandung Hub', address: 'Jl. Asia Afrika No. 10', latitude: -6.9175, longitude: 107.6191, radius_meters: 50, timezone: 'Asia/Jakarta' }
    ];

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
        responseBody = { name: 'Company1', enabled_modules: ['attendance', 'payroll', 'branches'], is_subscription_active: true };
      } else if (cleanUrl.match(/\/branches\/?$/)) {
        if (method === 'GET') {
          responseBody = mockBranches;
        } else if (method === 'POST') {
          const newBranch = { id: 'b3', name: 'Surabaya Office' };
          mockBranches.push(newBranch as any);
          responseBody = newBranch;
          status = 201;
        }
      } else if (cleanUrl.match(/\/branches\/[a-z0-9-]+\/?$/)) {
        const id = cleanUrl.split('/').filter(Boolean).pop();
        if (method === 'PATCH') {
          responseBody = { id, name: 'Jakarta Head Office' };
        } else if (method === 'DELETE') {
          mockBranches = mockBranches.filter(b => b.id !== id);
          responseBody = { success: true };
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

  test('should display branch list and support searching', async ({ page }) => {
    await page.goto(`${adminUrl}/en/branches?test_tenant=company1`);
    await expect(page.getByText('Jakarta Office')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Bandung Hub')).toBeVisible();
    
    // Test search
    const searchInput = page.getByPlaceholder(/Search branches/i);
    await searchInput.fill('Jakarta');
    await expect(page.getByText('Jakarta Office')).toBeVisible();
    await expect(page.getByText('Bandung Hub')).not.toBeVisible();
  });

  test('should add a new branch successfully', async ({ page }) => {
    await page.goto(`${adminUrl}/en/branches?test_tenant=company1`);
    await page.getByRole('button', { name: /Add Branch/i }).click();
    
    await expect(page.getByText(/Add New Branch/i)).toBeVisible();
    
    await page.locator('input[name="name"]').fill('Surabaya Office');
    await page.locator('textarea[name="address"]').fill('Jl. Tunjungan No. 5');
    await page.locator('input[name="latitude"]').fill('-7.2575');
    await page.locator('input[name="longitude"]').fill('112.7521');
    await page.locator('input[name="radius_meters"]').fill('150');
    await page.locator('select[name="timezone"]').selectOption('Asia/Jakarta');
    
    await page.getByRole('button', { name: /Create Branch/i }).click();
    await expect(page.getByText(/Add New Branch/i)).not.toBeVisible();
  });

  test('should edit an existing branch', async ({ page }) => {
    await page.goto(`${adminUrl}/en/branches?test_tenant=company1`);
    
    // Find Jakarta Office card and click edit
    const jakartaCard = page.locator('div.glass-card').filter({ hasText: 'Jakarta Office' });
    await jakartaCard.hover(); // Actions appear on hover
    await jakartaCard.locator('button').first().click(); // First button is edit
    
    await expect(page.getByText(/Edit Branch/i)).toBeVisible();
    await page.locator('input[name="name"]').fill('Jakarta Head Office');
    await page.getByRole('button', { name: /Save Changes/i }).click();
    
    await expect(page.getByText(/Edit Branch/i)).not.toBeVisible();
  });

  test('should delete a branch successfully', async ({ page }) => {
    await page.goto(`${adminUrl}/en/branches?test_tenant=company1`);
    
    // Find Bandung Hub card
    const bandungCard = page.locator('div.glass-card').filter({ hasText: 'Bandung Hub' });
    const deleteBtn = bandungCard.locator('button').nth(1);

    // Setup dialog handler before clicking
    page.once('dialog', dialog => dialog.accept());
    
    await deleteBtn.click({ force: true });
    
    // Wait for the card to disappear from the DOM
    await expect(bandungCard).not.toBeVisible({ timeout: 15000 });
  });
});
