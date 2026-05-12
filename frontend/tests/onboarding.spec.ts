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
    await expect(page.getByText(/Create your account|Buat akun Anda/i)).toBeVisible();

    // 3. Fill in the company details
    const timestamp = Date.now();
    const companyName = `Test Corp ${timestamp}`;
    const subdomain = `testcorp${timestamp}`;
    const adminEmail = `admin@testcorp${timestamp}.com`;

    await page.fill('input[name="company_name"]', companyName);
    await page.fill('input[name="subdomain_prefix"]', subdomain);
    await page.fill('input[name="admin_email"]', adminEmail);

    // 4. Submit the form
    // 4. Submit the form and wait for API response
    console.log('--- Submitting signup form ---');
    const signupPromise = page.waitForResponse(resp => resp.url().includes('/api/public/signup/') && resp.request().method() === 'POST', { timeout: 60000 }).catch(() => null);
    await page.click('button:has-text("Create Workspace"), button:has-text("Buat Ruang Kerja")');
    
    console.log('--- Waiting for signup API response ---');
    const signupResp = await signupPromise;
    if (signupResp && !signupResp.ok()) {
        const body = await signupResp.text();
        throw new Error(`Signup API failed with ${signupResp.status()}: ${body}`);
    }

    // 5. Verify the success state from real backend
    await expect(page.getByText(/Request Submitted!|Created successfully|Permintaan Terkirim!/i)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(companyName)).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();

    // 6. Verify back to home button works
    await page.click('button:has-text("Back to Home"), button:has-text("Kembali ke Beranda")');
    await expect(page).toHaveURL(/.*\/en$/, { timeout: 15000 });
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/signup`);
    
    await page.fill('input[name="company_name"]', 'Invalid Email Corp');
    await page.fill('input[name="subdomain_prefix"]', 'invalidemail');
    await page.fill('input[name="admin_email"]', 'not-an-email');
    
    // Attempt submit
    await page.click('button:has-text("Create Workspace"), button:has-text("Buat Ruang Kerja")');
    
    // 1. Check HTML5 validation (client-side)
    const isInvalid = await page.$eval('input[name="admin_email"]', (el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBeTruthy();
    
    // 2. Check if the button click shows a validation message
    // Usually browser shows a balloon, but we just verify it didn't submit
    await expect(page.getByText(/Request Submitted!|Permintaan Terkirim!/i)).not.toBeVisible();
  });
});
