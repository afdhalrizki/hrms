import { test, expect } from '@playwright/test';

test.describe('Attendance Lifecycle', () => {
  // Use a specific tenant subdomain for E2E
  const tenantUrl = 'http://company1.localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Navigate to tenant login
    await page.goto(`${tenantUrl}/login`);
    
    // Login as employee
    await page.locator('input[type="email"]').fill('employee1@company1.net');
    await page.locator('input[type="password"]').fill('password123'); // Placeholder for test data
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Verify dashboard redirect
    await expect(page).toHaveURL(new RegExp('/dashboard|/attendance'));
  });

  test('should perform daily check-in successfully', async ({ page }) => {
    // Navigate to Attendance page if not there
    await page.goto(`${tenantUrl}/attendance`);

    // Verify "Check In" button exists
    const checkInBtn = page.getByRole('button', { name: /Check In/i });
    await expect(checkInBtn).toBeVisible();

    // Click Check In
    await checkInBtn.click();

    // Verify Success Toast (Sonner)
    await expect(page.getByText(/Attendance recorded successfully/i)).toBeVisible();

    // Verify button text changes to "Check Out"
    const checkOutBtn = page.getByRole('button', { name: /Check Out/i });
    await expect(checkOutBtn).toBeVisible();
  });

  test('should display daily shift summary', async ({ page }) => {
    await page.goto(`${tenantUrl}/attendance`);
    
    // Verify shift cards
    await expect(page.getByText(/Shift Details/i)).toBeVisible();
    await expect(page.getByText(/Work Hours/i)).toBeVisible();
  });
});
