import { test, expect } from './fixtures';
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
    
    // Wait for loader to disappear
    await expect(page.getByText(/Loading employee data/i)).not.toBeVisible({ timeout: 15000 });

    // Manager One and Employee 1 should be visible
    await expect(async () => {
      await expect(page.getByText('Manager One')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Employee 1')).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
    
    // 2. Search functionality
    console.log('--- Searching for "Manager" ---');
    const searchInput = page.getByPlaceholder(/Search by name/i);
    await searchInput.fill('Manager');
    
    await expect(async () => {
      await expect(page.getByText('Manager One')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Employee 1')).not.toBeVisible();
    }).toPass({ timeout: 15000 });
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
    await page.locator('select[name="grade"]').selectOption({ label: '3A' });
    await page.locator('select[name="access_role"]').selectOption({ label: 'Finance Staff' });
    
    // Submit
    const provisionBtn = page.getByRole('button', { name: /Provision Employee/i });
    await provisionBtn.click();
    
    // Verify modal closes and success message
    await expect(page.getByText(/Provision New Employee/i)).not.toBeVisible({ timeout: 15000 });
    
    // Verify persistence in the list
    await page.fill('input[placeholder*="Search"]', fullname);
    await expect(page.getByText(fullname)).toBeVisible({ timeout: 15000 });
  });

  test('should fail to provision a new employee if email is active in another company', async ({ page }) => {
    await page.goto(getTenantUrl('/en/employees'));
    
    // Open Provisioning Modal
    const addBtn = page.getByRole('button', { name: /Add Employee/i });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    
    await expect(page.getByText(/Provision New Employee/i)).toBeVisible({ timeout: 15000 });
    
    const timestamp = Date.now();
    const fullname = `Cross Active Employee`;
    const nik = `CR${String(timestamp).slice(-6)}`;
    
    // employee1@company2.com is an active employee seeded in company2
    const email = `employee1@company2.com`;
    
    await page.locator('input[name="fullname"]').fill(fullname);
    await page.locator('input[name="nik"]').fill(nik);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="ktp_number"]').fill('31710' + String(timestamp).slice(-11));
    
    // Select options from seeded backend
    await page.locator('select[name="department"]').selectOption({ label: 'Engineering' });
    await page.locator('select[name="role"]').selectOption({ label: 'Software Engineer' });
    await page.locator('select[name="grade"]').selectOption({ label: '3A' });
    await page.locator('select[name="access_role"]').selectOption({ label: 'Finance Staff' });
    
    // Submit
    const provisionBtn = page.getByRole('button', { name: /Provision Employee/i });
    await provisionBtn.click();
    
    // It should NOT close the modal, instead it should show the validation error!
    await expect(page.getByText(/masih terdaftar\/aktif di perusahaan/i)).toBeVisible({ timeout: 15000 });
    
    // Close modal manually
    const cancelBtn = page.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }
  });

  test('should terminate an employee successfully', async ({ page }) => {
    await page.goto(getTenantUrl('/en/employees'));

    // Wait for loader to disappear
    await expect(page.getByText(/Loading employee data/i)).not.toBeVisible({ timeout: 15000 });

    // 1. Provision a new employee so we have a clean target to terminate
    const addBtn = page.getByRole('button', { name: /Add Employee/i });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();

    const timestamp = Date.now();
    const fullname = `Term Target ${timestamp}`;
    const nik = `NH${String(timestamp).slice(-6)}`;
    const email = `termtarget${timestamp}@company1.com`;

    await page.locator('input[name="fullname"]').fill(fullname);
    await page.locator('input[name="nik"]').fill(nik);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="ktp_number"]').fill('31710' + String(timestamp).slice(-11));

    await page.locator('select[name="department"]').selectOption({ label: 'Engineering' });
    await page.locator('select[name="role"]').selectOption({ label: 'Software Engineer' });
    await page.locator('select[name="grade"]').selectOption({ label: '3A' });
    await page.locator('select[name="access_role"]').selectOption({ label: 'Finance Staff' });

    const provisionBtn = page.getByRole('button', { name: /Provision Employee/i });
    await provisionBtn.click();

    // Verify modal closes
    await expect(page.getByText(/Provision New Employee/i)).not.toBeVisible({ timeout: 15000 });

    // 2. Search for the newly created employee
    const searchInput = page.getByPlaceholder(/Search by name/i);
    await searchInput.fill(fullname);
    await expect(page.getByText(fullname)).toBeVisible({ timeout: 15000 });

    // 3. Click "Terminate Staff" button.
    // First click the row dropdown actions menu button
    const row = page.locator('tr', { hasText: fullname });
    await row.locator('button').first().click();

    // Since Playwright dialogs need to be handled, we accept the confirmation dialog.
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Terminate this employee?');
      await dialog.accept();
    });

    const terminateBtn = page.getByRole('button', { name: /Terminate Staff/i });
    await expect(terminateBtn).toBeVisible({ timeout: 5000 });
    await terminateBtn.click();

    // 4. Verify toast message / success banner
    await expect(page.getByText(/Staff terminated/i)).toBeVisible({ timeout: 15000 });

    // 5. Verify the employee is hidden by default (since terminated staff are hidden by default)
    await expect(page.getByText(fullname)).not.toBeVisible({ timeout: 10000 });

    // 6. Click "Show Terminated Staff" toggle to verify they appear
    const toggleBtn = page.locator('button:has-text("Show Terminated Staff")');
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();

    // Verify the terminated employee is visible now
    await expect(page.getByText(fullname)).toBeVisible({ timeout: 15000 });
  });
});

