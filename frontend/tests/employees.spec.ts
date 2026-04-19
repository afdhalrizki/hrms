import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Employee Management', () => {
  const admin = TEST_USERS.admin;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `employees-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as admin@company1.com
    await login(page, admin.email, admin.password);
  });

  test('should display employee list and search for existing records', async ({ page }) => {
    await page.goto(getTenantUrl('/en/employees'));
    
    // 1. Verify list from real seeded backend
    // Manager One and Employee One should be visible
    await expect(page.getByText('Manager One')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Employee One')).toBeVisible();
    
    // 2. Search functionality
    const searchInput = page.getByPlaceholder(/Search by name/i);
    await searchInput.fill('Manager');
    await expect(page.getByText('Manager One')).toBeVisible();
    await expect(page.getByText('Employee One')).not.toBeVisible();
  });

  test('should provision a new employee successfully', async ({ page }) => {
    await page.goto(getTenantUrl('/en/employees'));
    
    // Open Provisioning Modal
    const addBtn = page.getByRole('button', { name: /Add Employee/i });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    
    await expect(page.getByText(/Provision New Employee/i)).toBeVisible({ timeout: 15000 });
    
    const timestamp = Date.now();
    const fullname = `New Hired ${timestamp}`;
    const nik = `NH${String(timestamp).slice(-6)}`;
    const email = `newhired${timestamp}@company1.com`;
    
    await page.locator('input[name="fullname"]').fill(fullname);
    await page.locator('input[name="nik"]').fill(nik);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="ktp_number"]').fill('31710' + String(timestamp).slice(-11));
    
    // Select options from seeded backend
    await page.locator('select[name="department"]').selectOption({ label: 'Engineering' });
    await page.locator('select[name="role"]').selectOption({ label: 'Software Engineer' });
    await page.locator('select[name="golongan"]').selectOption({ label: '3A' });
    await page.locator('select[name="access_role"]').selectOption({ label: 'Staff' });
    
    // Submit
    const provisionBtn = page.getByRole('button', { name: /Provision Employee/i });
    await provisionBtn.click();
    
    // Verify modal closes and success message
    await expect(page.getByText(/Provision New Employee/i)).not.toBeVisible({ timeout: 15000 });
    
    // Verify persistence in the list
    await page.fill('input[placeholder*="Search"]', fullname);
    await expect(page.getByText(fullname)).toBeVisible({ timeout: 15000 });
  });
});
