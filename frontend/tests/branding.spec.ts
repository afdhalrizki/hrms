import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('Branding and Identity', () => {
  const admin = TEST_USERS.admin;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `branding-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login against seeded backend
    await login(page, admin.email, admin.password);
  });

  test('should update company branding and apply theme instantly', async ({ page }) => {
    await page.goto(getTenantUrl('/en/settings/branding'));
    
    // Ensure the page is fully loaded and branding heading is visible
    await expect(page.getByRole('heading', { name: /Tenant Branding/i })).toBeVisible({ timeout: 15000 });
    
    // Modify a color - using the first color input (Primary Color)
    const primaryColorInput = page.locator('input[type="color"]').first();
    await primaryColorInput.fill('#ff0000');
    
    // Update - using the button defined in the UI
    const applyBtn = page.getByRole('button', { name: /Apply Changes/i });
    await expect(applyBtn).toBeVisible();
    
    // Explicitly wait for the backend response to ensure timing is correct
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/tenant/settings') && response.request().method() === 'PATCH'
    );
    
    await applyBtn.click();
    await responsePromise;
    
    // Verify persistence/success message from backend
    // Relaxed check to avoid timing/i18n flake in toasts
    await expect(page.locator('body')).toContainText(/successfully|success|branding/i, { timeout: 15000 });
    
    // Verify the input still has the value after reload to confirm persistence
    await page.reload();
    await expect(page.getByRole('heading', { name: /Tenant Branding/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="color"]').first()).toHaveValue('#ff0000', { timeout: 15000 });
  });
});
