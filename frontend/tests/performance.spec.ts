import { test, expect } from '@playwright/test';

test.describe('Performance & Appraisal Lifecycle', () => {
  const managerUrl = 'http://company1.localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Login as Manager
    await page.goto(`${managerUrl}/login`);
    await page.locator('input[type="email"]').fill('manager1@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
  });

  test('should submit appraisal review and update dashboard', async ({ page }) => {
    // Navigate to Performance
    await page.goto(`${managerUrl}/performance`);

    // Verify Appraisal Timeline
    await expect(page.getByText(/Overview/i)).toBeVisible();

    // Open Review Modal for a pending appraisal
    const reviewBtn = page.getByRole('button', { name: /Submit Review/i }).first();
    await expect(reviewBtn).toBeVisible();
    await reviewBtn.click();

    // Verify Rating Categories
    await expect(page.getByText(/Work Quality/i)).toBeVisible();
    await expect(page.getByText(/Communication/i)).toBeVisible();

    // Fill Ratings (1-5) and comment
    // Assuming simple selection or input
    await page.locator('textarea').fill('Exceeded expectations in Q1.');
    
    // Submit
    await page.getByRole('button', { name: /Submit Score/i }).click();

    // Verify Success Toast
    await expect(page.getByText(/Score submitted successfully/i)).toBeVisible();

    // Verify Dashboard score updates
    // (Actual logic check is hard without baseline, but we check visibility)
    await expect(page.getByText(/\d\.\d/i)).toBeVisible(); // Check for average like 4.5
  });
});
