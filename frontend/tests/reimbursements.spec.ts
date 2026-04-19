import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Reimbursement Management', () => {
  const employee = TEST_USERS.employee;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `reimbursements-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as employee1
    await login(page, employee.email, employee.password);
  });

  test('should allow employee to submit a new reimbursement claim', async ({ page }) => {
    await page.goto(getTenantUrl('/en/reimbursements'));
    await page.waitForLoadState('networkidle');

    // 1. Open New Claim Modal
    const addBtn = page.getByRole('button', { name: /New Claim|Add Reimbursement/i });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    
    await expect(page.getByRole('heading', { name: /New Reimbursement Claim/i })).toBeVisible({ timeout: 15000 });

    // 2. Select Category (Seeded: Medical, Travel)
    const categorySelect = page.locator('select[name="category"]');
    await categorySelect.selectOption({ label: 'Medical' });
    
    const amountInput = page.locator('input[name="amount"]');
    await amountInput.fill('150000');
    
    const descriptionInput = page.locator('textarea[name="description"]');
    await descriptionInput.fill('Integrated Test: Dental Checkup.');
    
    // 3. Submit
    const submitBtn = page.getByRole('button', { name: /Submit Claim/i });
    await submitBtn.click();
    
    // 4. Verify success from real backend
    await expect(page.getByText(/Claim submitted successfully!/i)).toBeVisible({ timeout: 15000 });
    
    // 5. Verify it appears in the list
    await expect(page.getByText('Medical')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('150,000')).toBeVisible();
    await expect(page.getByText('PENDING')).toBeVisible();
  });

  test('should validate reimbursement limits', async ({ page }) => {
    await page.goto(getTenantUrl('/en/reimbursements'));
    
    await page.getByRole('button', { name: /New Claim/i }).click();
    
    // Seeded medical limit is 1,000,000
    await page.locator('select[name="category"]').selectOption({ label: 'Medical' });
    await page.locator('input[name="amount"]').fill('2000000');
    await page.locator('textarea[name="description"]').fill('Limit Test');
    
    await page.getByRole('button', { name: /Submit Claim/i }).click();
    
    // Backend or frontend should return a limit error
    await expect(page.getByText(/Amount exceeds|limit/i)).toBeVisible({ timeout: 15000 });
  });
});
