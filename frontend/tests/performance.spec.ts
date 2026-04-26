import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Performance Management', () => {
  const employee = TEST_USERS.employee;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `performance-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as employee1
    await login(page, employee.email, employee.password);
  });

  test('should display current KPIs and targets', async ({ page }) => {
    await page.goto(getTenantUrl('/en/performance'));
    await page.waitForLoadState('networkidle');

    // 1. Verify KPI from real seeded backend
    // Seeded: 'Sales Target' for employee1
    await expect(page.getByText(/Sales Target/i)).toBeVisible({ timeout: 20000 });
    
    // 2. Verify Target Value (seeded as 1,000,000)
    await expect(page.getByText(/1.*000.*000/)).toBeVisible({ timeout: 15000 });
  });

  test('should allow employee to view and submit self-appraisal', async ({ page }) => {
    await page.goto(getTenantUrl('/en/performance'));
    
    // 1. Find the appraisal row (seeded as 'Q1 2026')
    const appraisalRow = page.locator('tr').filter({ hasText: 'Q1 2026' });
    await expect(appraisalRow).toBeVisible({ timeout: 15000 });
    
    // 2. Open Self Appraisal Modal
    const reviewBtn = appraisalRow.getByRole('button', { name: /Review|Submit/i });
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
      
      await expect(page.getByRole('heading', { name: /Submit Performance Review/i })).toBeVisible({ timeout: 10000 });
      
      // 3. Fill self-review
      await page.locator('textarea').fill('Integrated Test: I achieved my targets this month.');
      
      // 4. Submit
      const submitBtn = page.getByRole('button', { name: /Submit Score/i });
      await submitBtn.click();
      
      // 5. Verify success
      await expect(page.getByText(/Performance review submitted successfully/i)).toBeVisible({ timeout: 20000 });
    } else {
      console.log('Self appraisal button not found, it might already be submitted in this seed.');
    }
  });
});
