import { test, expect } from '@playwright/test';

test.describe('Company Onboarding Flow', () => {
  test('should allow a new company to submit a registration request', async ({ page }) => {
    // 1. Navigate to the signup page
    await page.goto('/signup');

    // 2. Verify we are on the right page
    await expect(page).toHaveTitle(/harikerja/i);
    await expect(page).toHaveURL(/.*\/signup/);
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

    // DEBUG: Take a screenshot to see what's happening
    await page.screenshot({ path: 'onboarding-failure.png' });

    // 5. Verify the success state
    // The page shows "Request Submitted!" on success
    // If it fails, let's look for error messages first to provide better debug info
    const errorBox = page.locator('div:has-text("Something went wrong")');
    if (await errorBox.isVisible()) {
      const errorText = await errorBox.innerText();
      console.error('Signup failed with error:', errorText);
    }

    await expect(page.getByText('Request Submitted!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(companyName)).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();

    // 6. Verify back to home button works
    await page.click('button:has-text("Back to Home")');
    await expect(page).toHaveURL('/');
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="company_name"]', 'Invalid Email Corp');
    await page.fill('input[name="subdomain_prefix"]', 'invalidemail');
    await page.fill('input[name="admin_email"]', 'not-an-email');
    
    // HTML5 validation might catch this first, but let's see if our logic handles it
    await page.click('button:has-text("Create Workspace")');
    
    // Check if the HTML5 validation is triggered (Playwright handles browser native validation)
    const isInvalid = await page.$eval('input[name="admin_email"]', (el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBeTruthy();
  });
});
