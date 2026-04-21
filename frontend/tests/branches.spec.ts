import { test, expect } from '@playwright/test';
import { login, TEST_USERS, getTenantUrl } from './test_helper';
import { execSync } from 'child_process';

test.describe.serial('Branch Management', () => {
  const admin = TEST_USERS.admin;

  test.beforeAll(async () => {
    // Reset database once before the whole suite
    try {
      execSync('/home/afdhal/data/hr/hrms/backend/venv/bin/python /home/afdhal/data/hr/hrms/backend/scripts/seed_test_db.py');
    } catch (error) {
      console.error('Failed to seed DB:', error);
    }
  });

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    // Perform real login as admin
    await login(page, admin.email, admin.password);
  });

  test('should display branch list and support searching', async ({ page }) => {
    await page.goto(getTenantUrl('/en/branches'));
    
    // 1. Verify branches from real seeded backend
    await expect(page.locator('h3', { hasText: /Jakarta Office/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h3', { hasText: 'Bandung Hub' })).toBeVisible();
    
    // 2. Test search
    const searchInput = page.getByPlaceholder(/Search branches/i);
    await searchInput.fill('Bandung');
    await expect(page.locator('h3', { hasText: 'Bandung Hub' })).toBeVisible();
    await expect(page.locator('h3', { hasText: /Jakarta Office/i })).not.toBeVisible();
  });

  test('should add a new branch successfully', async ({ page }) => {
    await page.goto(getTenantUrl('/en/branches'));
    
    const branchName = 'Surabaya Branch ' + Date.now();
    
    await page.getByRole('button', { name: /Add Branch/i }).click();
    await expect(page.getByText(/Add New Branch/i)).toBeVisible();
    
    await page.locator('input[name="name"]').fill(branchName);
    await page.locator('textarea[name="address"]').fill('Jl. Tunjungan No. 10');
    await page.locator('input[name="latitude"]').fill('-7.2575');
    await page.locator('input[name="longitude"]').fill('112.7521');
    await page.locator('input[name="radius_meters"]').fill('200');
    
    await page.getByRole('button', { name: /Create Branch/i }).click();
    
    // Verify success toast and new branch card
    await expect(page.getByText(/Branch created successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h3', { hasText: branchName })).toBeVisible();
  });

  test('should edit an existing branch', async ({ page }) => {
    await page.goto(getTenantUrl('/en/branches'));
    
    // Find Jakarta Office card and click edit
    const editBtn = page.getByTestId('edit-branch-Jakarta Office');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click({ force: true });
    
    await expect(page.getByText(/Edit Branch/i)).toBeVisible();
    const newName = 'Jakarta HQ ' + Date.now();
    await page.locator('input[name="name"]').fill(newName);
    await page.getByRole('button', { name: /Save Changes/i }).click();
    
    // Verify success toast and updated name
    await expect(page.getByText(/Branch updated successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h3', { hasText: newName })).toBeVisible();
  });

  test('should delete a branch successfully', async ({ page }) => {
    await page.goto(getTenantUrl('/en/branches'));
    
    // Find Bandung Hub card
    const deleteBtn = page.getByTestId('delete-branch-Bandung Hub');
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });

    // Setup dialog handler
    page.on('dialog', dialog => dialog.accept());
    
    await deleteBtn.click({ force: true });
    
    // Wait for branch to disappear and check toast
    await expect(page.locator('h3', { hasText: 'Bandung Hub' })).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Branch deleted successfully/i)).toBeVisible();
  });
});
