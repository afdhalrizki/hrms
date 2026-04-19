import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Analytics Dashboard', () => {
  const admin = TEST_USERS.admin;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `analytics-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as admin
    await login(page, admin.email, admin.password);
  });

  test('should display accurate department headcount stats', async ({ page }) => {
    await page.goto(getTenantUrl('/en/dashboard'));
    await page.waitForLoadState('networkidle');

    // 1. Verify Headcount (seeded as 3 total)
    // Looking for a stat card with value "3"
    const totalEmployees = page.getByText('3', { exact: true });
    await expect(totalEmployees.first()).toBeVisible({ timeout: 20000 });
    
    // 2. Verify Department breakdown
    // Seeded: 'Engineering' (3 employees)
    await expect(page.getByText(/Engineering/i)).toBeVisible();
    await expect(page.getByText('100.0%')).toBeVisible(); // Since all are in Engineering
  });

  test('should display payroll trends reflecting real data', async ({ page }) => {
    await page.goto(getTenantUrl('/en/dashboard'));
    
    // Seeded data: Net Pay 16,500,000 for one payslip
    // We expect the sum or trend to reflect this value (formatted)
    const payrollValue = page.getByText(/16,500,000/);
    await expect(payrollValue.first()).toBeVisible({ timeout: 15000 });
  });

  test('should display attendance trends for today', async ({ page }) => {
    await page.goto(getTenantUrl('/en/dashboard'));
    
    // Seeded data: 1 active check-in (employee1) out of 3 employees
    // Expecting 33% or 1/3 in attendance stats
    await expect(page.getByText(/33\.3%|33%/)).toBeVisible({ timeout: 15000 });
  });
});
