import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('Branding and Identity', () => {
  const admin = TEST_USERS.admin;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `branding-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    // Perform real login against seeded backend
    await login(page, admin.email, admin.password);
  });

  test('should update company branding and apply theme instantly', async ({ page }) => {
    await page.goto(getTenantUrl('/en/settings/branding'));
    
    // Wait for loader to disappear and ensure we are not on restricted page
    await expect(async () => {
      if (await page.getByText(/Restricted Access/i).isVisible()) {
        await page.reload();
      }
      await expect(page.locator('svg.animate-spin')).not.toBeVisible();
    }).toPass({ timeout: 30000 });
    
    // Modify colors using text inputs for stability
    const primaryInput = page.getByTestId('primary-color-input');
    const secondaryInput = page.getByTestId('secondary-color-input');
    
    await expect(primaryInput).toBeVisible({ timeout: 15000 });
    await primaryInput.fill('#ff0000');
    await secondaryInput.fill('#00ff00');
    
    // Update - using the button defined in the UI
    const applyBtn = page.getByRole('button', { name: /Apply Changes/i });
    await expect(applyBtn).toBeVisible();
    
    // Explicitly wait for the backend response to ensure timing is correct
    // We use a more flexible URL check to handle potential variations in base URL or trailing slashes
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('tenant/settings') && response.request().method() === 'PATCH',
      { timeout: 30000 }
    );
    
    await applyBtn.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    // Verify persistence/success message from backend
    await expect(page.locator('body')).toContainText(/successfully|success/i, { timeout: 15000 });
    
    // Additional wait for the state to settle
    await page.waitForTimeout(2000);
    
    // Verify the input still has the value after reload to confirm persistence
    await page.reload();
    await expect(page.getByRole('heading', { name: /Tenant Branding/i })).toBeVisible({ timeout: 15000 });
    
    // Re-locate inputs after reload
    await expect(page.getByTestId('primary-color-input')).toHaveValue('#ff0000', { timeout: 20000 });
    await expect(page.getByTestId('secondary-color-input')).toHaveValue('#00ff00', { timeout: 20000 });
  });
});
