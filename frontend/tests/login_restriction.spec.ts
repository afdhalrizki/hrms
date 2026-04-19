import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('Login & Tenant Restriction', () => {
  const admin = TEST_USERS.admin;
  const admin2 = TEST_USERS.admin_company2;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `login-restriction-failure.png`, fullPage: true });
    }
  });

  test('should allow login with valid credentials for correct tenant', async ({ page }) => {
    await login(page, admin.email, admin.password);
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.getByText(admin.fullname)).toBeVisible();
  });

  test('should fail login for wrong tenant context', async ({ page }) => {
    // Attempting to login to company2 with company1 credentials should fail 
    // because seeded users are strictly isolated to their tenants.
    await page.goto(getTenantUrl('/en/login/portal-admin', 'company2'));
    await page.fill('input[type="email"]', admin.email);
    await page.fill('input[type="password"]', admin.password);
    await page.click('button[type="submit"]');

    // Verify error message from backend
    await expect(page.getByText(/Invalid credentials|Access Denied|Akses ditolak/i)).toBeVisible({ timeout: 15000 });
  });

  test('should maintain strict tenant isolation during session usage', async ({ page }) => {
    // 1. Login to company1
    await login(page, admin.email, admin.password);
    
    // 2. Attempt to context-switch to company2 data via direct URL
    // Should result in a "Restricted Access" or rejection from the middleware
    await page.goto(getTenantUrl('/en/settings/branding', 'company2'));
    
    // We expect the system to either block access or keep showing company1 data
    // Usually, the tenant context is derived from headers or URL
    // If it detects a mismatch, it should show a restriction message
    await expect(page.getByText(/Restricted Access|Access Denied/i)).toBeVisible({ timeout: 10000 });
  });

  test('should prevent login for non-existent users', async ({ page }) => {
    await page.goto(getTenantUrl('/en/login/portal-admin'));
    await page.fill('input[type="email"]', 'ghost@company1.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  });
});
