import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe.serial('Branch Management', () => {
  const admin = TEST_USERS.admin;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `branches-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as admin
    await login(page, admin.email, admin.password);
  });

  test('should display branch list and support searching', async ({ page }) => {
    await page.goto(getTenantUrl('/en/branches'));
    
    // 1. Verify branches from real seeded backend
    await expect(page.getByText('Jakarta Office')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Bandung Hub')).toBeVisible();
    
    // 2. Test search
    const searchInput = page.getByPlaceholder(/Search branches/i);
    await searchInput.fill('Jakarta');
    await expect(page.getByText('Jakarta Office')).toBeVisible();
    await expect(page.getByText('Bandung Hub')).not.toBeVisible();
  });

  test('should add a new branch successfully', async ({ page }) => {
    await page.goto(getTenantUrl('/en/branches'));
    const addBtn = page.getByRole('button', { name: /Add Branch/i });
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    
    await expect(page.getByText(/Add New Branch/i)).toBeVisible();
    
    const timestamp = Date.now();
    const branchName = `Office ${timestamp}`;
    
    await page.locator('input[name="name"]').fill(branchName);
    await page.locator('textarea[name="address"]').fill('Jl. Integrated Test No. 99');
    await page.locator('input[name="latitude"]').fill('-7.9893');
    await page.locator('input[name="longitude"]').fill('112.6245');
    await page.locator('input[name="radius_meters"]').fill('200');
    await page.locator('select[name="timezone"]').selectOption({ label: 'Asia/Jakarta' });
    
    await page.getByRole('button', { name: /Create Branch/i }).click();
    
    // Verify modal closes and success message
    await expect(page.getByText(/Branch created successfully/i)).toBeVisible({ timeout: 15000 });
    
    // Verify persistence in the list
    await page.fill('input[placeholder*="Search"]', branchName);
    await expect(page.getByText(branchName)).toBeVisible({ timeout: 15000 });
  });

  test('should edit an existing branch', async ({ page }) => {
    await page.goto(getTenantUrl('/en/branches'));
    
    // Find Jakarta Office card and click edit
    const jakartaCard = page.locator('div.glass-card').filter({ hasText: 'Jakarta Office' });
    await jakartaCard.hover(); 
    
    // On hover, we expect edit and delete buttons
    // The edit button usually has a pencil icon or is the first button in the actions group
    const editBtn = jakartaCard.locator('button').first();
    await editBtn.click();
    
    await expect(page.getByText(/Edit Branch/i)).toBeVisible();
    const newName = 'Jakarta HQ ' + Date.now();
    await page.locator('input[name="name"]').fill(newName);
    await page.getByRole('button', { name: /Save Changes/i }).click();
    
    await expect(page.getByText(/Branch updated successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(newName)).toBeVisible();
  });

  test('should delete a branch successfully', async ({ page }) => {
    await page.goto(getTenantUrl('/en/branches'));
    
    // Find Bandung Hub card
    const bandungCard = page.locator('div.glass-card').filter({ hasText: 'Bandung Hub' });
    await bandungCard.hover();
    
    // Delete button is usually the second button
    const deleteBtn = bandungCard.locator('button').nth(1);

    // Setup dialog handler before clicking
    page.once('dialog', dialog => dialog.accept());
    
    await deleteBtn.click({ force: true });
    
    // Verify the card disappears and success toast
    await expect(page.getByText(/Branch deleted successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(bandungCard).not.toBeVisible({ timeout: 15000 });
  });
});
