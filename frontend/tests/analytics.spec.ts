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
    await page.goto(getTenantUrl('/en/analytics'));
    await page.waitForLoadState('networkidle');

    // 1. Verify Headcount (seeded as 3 total, but other tests may add more)
    const headcountKpi = page.getByTestId('kpi-totalHeadcount-value');
    await expect(headcountKpi).toBeVisible({ timeout: 30000 });
    
    // Wait for data to load (value > 0)
    await expect(async () => {
      const val = await headcountKpi.innerText();
      if (parseInt(val) === 0) throw new Error('Data not loaded yet');
    }).toPass({ timeout: 20000 });

    const text = await headcountKpi.innerText();
    console.log(`DEBUG: Total Headcount KPI Text: "${text}"`);
    const count = parseInt(text);
    expect(count).toBeGreaterThanOrEqual(3);
    
    // 2. Verify Department breakdown
    // Seeded: 'Engineering' (at least 3 employees)
    await expect(page.getByText('Engineering', { exact: true }).first()).toBeVisible();
    // In analytics page, it shows X staff for Engineering
    const staffCount = page.getByTestId('dept-staff-count').first();
    await expect(staffCount).toBeVisible();
    const engText = await staffCount.innerText();
    const engCount = parseInt(engText.split(' ')[0]);
    expect(engCount).toBeGreaterThanOrEqual(3);
  });

  test('should display payroll trends reflecting real data', async ({ page }) => {
    await page.goto(getTenantUrl('/en/analytics'));
    
    // Seeded data: Net Pay 16,500,000 for one payslip
    const payrollValue = page.locator('[data-testid="kpi-totalPayroll-value"]');
    await expect(payrollValue).toContainText(/16.*500.*000/, { timeout: 15000 });
  });

  test('should display attendance trends for today', async ({ page }) => {
    await page.goto(getTenantUrl('/en/analytics'));
    
    const attendanceRate = page.locator('[data-testid="kpi-attendanceRate-value"]');
    await expect(attendanceRate).toBeVisible({ timeout: 30000 });
    const text = await attendanceRate.innerText();
    console.log(`DEBUG: Attendance Rate: "${text}"`);
    // Seeded at least 1 person present. 
    // If 3 employees, it's 33.3%. If 4 employees, it's 25%.
    // Just verify it's a number > 0.
    const rate = parseFloat(text.replace('%', ''));
    expect(rate).toBeGreaterThan(0);
  });
});
