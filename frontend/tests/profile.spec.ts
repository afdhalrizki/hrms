import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('ESS Profile Management', () => {
  const employee = TEST_USERS.employee;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `profile-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as employee1
    await login(page, employee.email, employee.password);
  });

  test('should verify administrative fields are read-only', async ({ page }) => {
    await page.goto(getTenantUrl('/en/profile'));
    
    // 1. Verify NIK from seed
    await expect(page.getByText(employee.nik)).toBeVisible({ timeout: 15000 });

    // 2. Verify Email field is disabled
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeDisabled();
    await expect(emailInput).toHaveValue(employee.email);

    // 3. Verify Department from seed (Engineering)
    await expect(page.getByText('Engineering')).toBeVisible();
  });

  test('should allow employee to update self-service fields', async ({ page }) => {
    await page.goto(getTenantUrl('/en/profile'));
    
    // We expect the form to be reactive
    const phoneInput = page.locator('input[placeholder="+62..."]');
    await expect(phoneInput).toBeVisible({ timeout: 10000 });

    // Update fields
    const newPhone = '0812' + Math.floor(Math.random() * 10000000);
    await phoneInput.fill(newPhone);
    
    const addressInput = page.locator('textarea');
    const newAddress = 'Jl. Integrated Test No. ' + Math.floor(Math.random() * 100);
    await addressInput.fill(newAddress);

    const ptkpSelect = page.locator('select');
    await ptkpSelect.selectOption('K/2');

    // Submit changes
    const saveBtn = page.getByRole('button', { name: /Save Changes/i });
    await saveBtn.click();

    // Verify success toast/message from real backend
    await expect(page.getByText(/Profile updated successfully/i)).toBeVisible({ timeout: 15000 });
    
    // Verify persistence after reload
    await page.reload();
    await expect(phoneInput).toHaveValue(newPhone);
  });

  test('should allow document upload for KTP', async ({ page }) => {
    await page.goto(getTenantUrl('/en/profile'));
    
    await expect(page.getByText(employee.nik)).toBeVisible();

    // Find the hidden file input
    const ktpInput = page.locator('input#ktp-upload');
    
    // Create a valid 1x1 transparent PNG buffer
    const buffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
    
    // Upload files
    await ktpInput.setInputFiles({
      name: 'ktp_test.png',
      mimeType: 'image/png',
      buffer: buffer
    });

    // Verify success - component should show toast
    await expect(page.getByText(/Document uploaded successfully/i)).toBeVisible({ timeout: 20000 });
  });
});
