
import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl, waitForNoLoaders } from './test_helper';
import * as path from 'path';

test.describe('Fingerprint Integration E2E', () => {
  const admin = TEST_USERS.admin;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `fingerprint-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page, admin.email, admin.password);
  });

  test('should allow admin to enable fingerprint policy, view menu, and upload excel logs', async ({ page }) => {
    // 1. Go to Settings to make sure Fingerprint Policy is enabled
    await page.goto(getTenantUrl('/en/settings'));
    // Target the toggle wrapper by looking for the switch or its text
    const toggleContainer = page.getByText('Enable Fingerprint Integration').locator('xpath=../..');
    const toggleButton = toggleContainer.locator('button');
    const saveBtn = page.getByRole('button', { name: /Save Profile|Save Settings/i }).first();

    await expect(toggleButton).toBeVisible({ timeout: 20000 });
    const classList = await toggleButton.getAttribute('class');
    if (classList && !classList.includes('bg-primary')) {
      await toggleButton.click();
      await saveBtn.click();
      await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 15000 });
    }

    // 2. Navigate to Fingerprint Devices page
    await page.goto(getTenantUrl('/en/settings/fingerprint-devices'));
    await waitForNoLoaders(page);

    await expect(page.locator('h1').last()).toContainText(/Fingerprint Devices/i);

    // 3. Open Import Logs Modal
    const importBtn = page.getByTestId('import-logs-btn');
    await expect(importBtn).toBeVisible({ timeout: 15000 });
    await importBtn.click();

    await expect(page.getByTestId('import-modal-title')).toBeVisible();

    // 4. Select and upload the Excel file
    const fileInput = page.getByTestId('import-file-input');
    const filePath = path.resolve(__dirname, 'test_logs.xlsx');
    await fileInput.setInputFiles(filePath);

    // 5. Submit the upload form
    const submitBtn = page.getByTestId('submit-import-btn');
    await expect(submitBtn).toBeEnabled();

    // Listen to the api request
    const importPromise = page.waitForResponse(
      res => res.url().includes('/api/fingerprint-devices/import-logs') && res.status() === 200,
      { timeout: 30000 }
    );

    await submitBtn.click();
    await importPromise;

    // 6. Verify toast notification of success
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toBeVisible({ timeout: 15000 });
    await expect(toast).toContainText(/Successfully processed|Inserted/i);
  });
});
