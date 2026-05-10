import { test, expect } from './fixtures';
import { BASE_URL } from './test_helper';

test.describe('Company Onboarding Flow', () => {

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `onboarding-failure.png`, fullPage: true });
    }
  });

  // No absolute beforeEach mocking - we want the real backend!

  test('should allow a new company to submit a registration request', async ({ page }) => {
    // 1. Navigate to the signup page 
    // We don't use ?test_tenant here because signup is on the public root
    await page.goto(`${BASE_URL}/en/signup`);

    // 2. Verify we are on the right page
    await expect(page).toHaveURL(/.*\/signup/, { timeout: 15000 });
    await expect(page.getByText(/Create your account/i)).toBeVisible();

    // 3. Fill in the company details
    const timestamp = Date.now();
    const companyName = `Test Corp ${timestamp}`;
    const subdomain = `testcorp${timestamp}`;
    const adminEmail = `admin@testcorp${timestamp}.com`;

    await page.fill('input[name="company_name"]', companyName);
    await page.fill('input[name="subdomain_prefix"]', subdomain);
    await page.fill('input[name="admin_email"]', adminEmail);

    // 4. Submit the form
    await page.click('button:has-text("Create Workspace")');

    // 5. Verify the success state from real backend
    // Backend should return 201 Created and the frontend should show the success view
    await expect(page.getByText(/Request Submitted!|Created successfully/i)).toBeVisible({ timeout: 120000 });
    await expect(page.getByText(companyName)).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();

    // 6. Verify back to home button works
    await page.click('button:has-text("Back to Home")');
    await expect(page).toHaveURL(/.*\/en$/, { timeout: 15000 });
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/signup`);
    
    await page.fill('input[name="company_name"]', 'Invalid Email Corp');
    await page.fill('input[name="subdomain_prefix"]', 'invalidemail');
    await page.fill('input[name="admin_email"]', 'not-an-email');
    
    // Attempt submit
    await page.click('button:has-text("Create Workspace")');
    
    // 1. Check HTML5 validation (client-side)
    const isInvalid = await page.$eval('input[name="admin_email"]', (el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBeTruthy();
    
    // 2. Check if the button click shows a validation message
    // Usually browser shows a balloon, but we just verify it didn't submit
    await expect(page.getByText(/Request Submitted!/i)).not.toBeVisible();
  });
});
