import { test, expect } from '@playwright/test';

test.describe('Company Onboarding Flow', () => {

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `onboarding-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Universal Mock for public endpoints
    await page.route('**/api/**', async route => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
        return;
      }

      if (url.includes('/api/public/signup') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Registration request submitted' })
        });
        return;
      }

      await route.fallback();
    });
  });

  test('should allow a new company to submit a registration request', async ({ page }) => {
    // 1. Navigate to the signup page
    await page.goto('/signup');

    // 2. Verify we are on the right page
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

    // 5. Verify the success state
    await expect(page.getByText('Request Submitted!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(companyName)).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();

    // 6. Verify back to home button works
    await page.click('button:has-text("Back to Home")');
    await expect(page).toHaveURL(/.*\/en$/);
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="company_name"]', 'Invalid Email Corp');
    await page.fill('input[name="subdomain_prefix"]', 'invalidemail');
    await page.fill('input[name="admin_email"]', 'not-an-email');
    
    // HTML5 validation catches this, or the button click triggers it
    await page.click('button:has-text("Create Workspace")');
    
    // Check if the HTML5 validation is triggered
    const isInvalid = await page.$eval('input[name="admin_email"]', (el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBeTruthy();
  });
});
