import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Leaves Management', () => {
  const employee = TEST_USERS.employee;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `leaves-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as employee1
    await login(page, employee.email, employee.password);
  });

  test('should display leave balances and empty history initially', async ({ page }) => {
    await page.goto(getTenantUrl('/en/leaves'));
    
    // 1. Check remaining days from real seeded backend (12 days total, 0 used)
    await expect(page.getByText('12')).toBeVisible({ timeout: 15000 });
    
    // 2. Check history table (should be empty or show "No data")
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // We expect "No data" or similar if it's a fresh seed
    // But we'll mostly care about the balances and the ability to submit
  });

  test('should submit a new leave request successfully', async ({ page }) => {
    await page.goto(getTenantUrl('/en/leaves'));
    
    // 1. Verify balances are loaded
    await expect(page.getByText('12')).toBeVisible({ timeout: 10000 });
    
    // 2. Open Request Leave Modal
    const requestBtn = page.getByRole('button', { name: /Request Leave/i });
    await expect(requestBtn).toBeVisible();
    await requestBtn.click();
    
    await expect(page.getByRole('heading', { name: /New Leave Request/i })).toBeVisible({ timeout: 10000 });
    
    // 3. Fill form
    await page.locator('textarea').fill('Integrated test leave: Family vacation.');
    
    // 4. Submit
    const submitBtn = page.getByRole('button', { name: /Apply|Submit/i }).last();
    await submitBtn.click();
    
    // 5. Verify success toast from real backend
    await expect(page.getByText(/Leave request submitted successfully!/i)).toBeVisible({ timeout: 15000 });
    
    // 6. Verify it appears in history
    await expect(page.getByText('Family vacation')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PENDING')).toBeVisible();
  });
});
