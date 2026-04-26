import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('Analytics Dashboard', () => {
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
    // Wait for initial load
    await expect(page.getByText(/Loading/i)).not.toBeVisible({ timeout: 15000 });
    
    const headcountKpi = page.getByTestId('kpi-totalHeadcount-value');
    await expect(headcountKpi).toBeVisible({ timeout: 30000 });
    
    // Wait for data to load (value > 0)
    await expect(async () => {
      const val = await headcountKpi.innerText();
      const count = parseInt(val);
      if (isNaN(count) || count === 0) throw new Error(`Headcount not loaded yet: "${val}"`);
    }).toPass({ timeout: 30000 });

    const count = parseInt(await headcountKpi.innerText());
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
    
    // Use toPass to wait for data fetch to complete and UI to update
    await expect(async () => {
      // Check for loader first
      await expect(page.getByText(/Loading attendance data/i)).not.toBeVisible({ timeout: 5000 });
      
      const successRateKpi = page.getByText(/ATTENDANCE RATE|Attendance Rate/i);
      await expect(successRateKpi).toBeVisible({ timeout: 5000 });
      
      // The value is in a sibling or next paragraph, but we just verify the label is there for now
      // Or we can check for a value > 0 if we are sure it's seeded
    }).toPass({ timeout: 20000 });
    
    const attendanceRate = page.locator('[data-testid="kpi-attendanceRate-value"]');
    await expect(attendanceRate).toBeVisible({ timeout: 45000 });
    
    // Wait for rate to be > 0 if seeded
    await expect(async () => {
      const text = await attendanceRate.innerText();
      const rate = parseFloat(text.replace('%', ''));
      if (isNaN(rate) || rate === 0) throw new Error(`Attendance rate not loaded or zero: "${text}"`);
    }).toPass({ timeout: 30000 });

    const text = await attendanceRate.innerText();
    const rate = parseFloat(text.replace('%', ''));
    expect(rate).toBeGreaterThan(0);
  });
});
