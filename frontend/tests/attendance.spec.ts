import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Attendance Management', () => {
  const employee = TEST_USERS.employee;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `attendance-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as employee1
    await login(page, employee.email, employee.password);
  });

  test('should verify attendance dashboard and perform check-out', async ({ page }) => {
    await page.goto(getTenantUrl('/en/attendance'));
    await page.waitForLoadState('networkidle');
    
    // 1. Verify Stats from real backend
    // Since employee1 is seeded with a check-in, success rate or presence should be reflected
    await expect(page.getByText(/Success Rate/i)).toBeVisible({ timeout: 15000 });
    
    // 2. Perform Check Out 
    // employee1 is already checked in by the seed script.
    const checkOutBtn = page.getByRole('button', { name: /Check Out/i });
    await expect(checkOutBtn).toBeVisible({ timeout: 15000 });
    await checkOutBtn.click();
    
    // Verify success toast from real backend
    await expect(page.getByText(/Attendance recorded successfully|Clocked out successfully/i)).toBeVisible({ timeout: 15000 });
  });

  test('should allow employee to submit a correction request', async ({ page }) => {
    await page.goto(getTenantUrl('/en/attendance'));
    await page.waitForLoadState('networkidle');

    // 1. Open Correction Modal
    const requestCorrectionBtn = page.getByRole('button', { name: /Request Correction/i }).first();
    await expect(requestCorrectionBtn).toBeVisible({ timeout: 10000 });
    await requestCorrectionBtn.click();
    
    await expect(page.getByRole('heading', { name: /Request Correction/i })).toBeVisible();
    
    // 2. Fill form
    await page.locator('textarea').fill('Integrated test correction request: Forgot to check out yesterday.');
    
    // 3. Submit
    const submitBtn = page.getByRole('button', { name: /Submit Request/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      // Fallback if the button text is different or in a form
      await page.locator('form').evaluate(node => (node as HTMLFormElement).requestSubmit());
    }
    
    // 4. Verify success from real backend
    await expect(page.getByText(/Correction request submitted successfully!/i)).toBeVisible({ timeout: 15000 });
  });
});
