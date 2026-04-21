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
    
    // 1. Open New Claim Modal
    await page.getByRole('button', { name: /New Reimbursement Claim/i }).first().click({ timeout: 60000 });
    
    await expect(page.getByRole('heading', { name: /New Reimbursement Claim/i })).toBeVisible({ timeout: 15000 });

    // 2. Fill the form
    const categorySelect = page.locator('select[name="category"]');
    await expect(categorySelect).toBeVisible({ timeout: 15000 });
    
    // Wait for categories to load (options > 1 because first is often placeholder or default)
    await expect(async () => {
      const count = await categorySelect.locator('option').count();
      if (count <= 1) throw new Error('Categories not loaded yet');
    }).toPass({ timeout: 20000 });

    console.log(`DEBUG: Available Categories: "${await categorySelect.innerText()}"`);
    await categorySelect.selectOption({ label: 'Medical' });
    
    const amountInput = page.locator('input[name="amount"]');
    await amountInput.fill('150000');
    
    const descriptionInput = page.locator('textarea[name="description"]');
    await descriptionInput.fill('Integrated Test: Dental Checkup.');
    
    // 3. Submit
    const submitBtn = page.getByTestId('reimbursement-submit');
    await submitBtn.click();
    
    // 4. Verify success from real backend (use toPass to handle potential async updates)
    await expect(async () => {
      // First check for any success indicator (toast or table update)
      const successText = page.getByText(/submitted successfully|Medical/i);
      await expect(successText.first()).toBeVisible();
      
      // Specifically check table row
      const row = page.locator('tr').filter({ hasText: 'Medical' });
      await expect(row.first()).toBeVisible();
      await expect(row.getByText('150,000')).toBeVisible();
      await expect(row.getByText('PENDING')).toBeVisible();
    }).toPass({ timeout: 20000 });
  });

  test('should validate reimbursement limits', async ({ page }) => {
    await page.goto(getTenantUrl('/en/reimbursements'));
    
    await page.locator('button:has-text("New Reimbursement Claim")').first().click();
    
    // Seeded medical limit is 1,000,000
    await page.locator('select[name="category"]').selectOption({ label: 'Medical' });
    await page.locator('input[name="amount"]').fill('2000000');
    await page.locator('textarea[name="description"]').fill('Limit Test');
    
    await page.getByTestId('reimbursement-submit').click();
    
    // Backend or frontend should return a limit error
    await expect(page.getByText(/Amount exceeds|limit/i)).toBeVisible({ timeout: 15000 });
  });
});
