import { test, expect } from './fixtures';
import { getTenantUrl, TEST_USERS } from './test_helper';

test.describe('Forgot Password Flow on Tenant Domain', () => {
  test('should allow a user to navigate to forgot-password from login and submit request', async ({ page }) => {
    // Listen to console and network
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => console.error(`BROWSER ERROR: ${err.message}`));
    page.on('requestfailed', request => console.error(`REQ FAILED: ${request.url()} - ${request.failure()?.errorText}`));

    // 1. Visit tenant login page
    const loginUrl = getTenantUrl('/en/login');
    console.log(`Navigating to login page: ${loginUrl}`);
    await page.goto(loginUrl);

    // 2. Click "Lupa kata sandi?"
    const forgotPasswordLink = page.locator('a, button').filter({ hasText: /Lupa kata sandi\?|Forgot password\?/i });
    await expect(forgotPasswordLink).toBeVisible({ timeout: 15000 });
    await forgotPasswordLink.click();

    // 3. Verify navigation to /forgot-password
    await expect(page).toHaveURL(/.*\/forgot-password/, { timeout: 15000 });
    console.log(`Successfully navigated to: ${page.url()}`);

    // 4. Fill email and submit
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    
    // We can use the admin email for company1 (or custom worker tenant)
    const email = TEST_USERS.admin.email;
    await emailInput.fill(email);
    
    const submitBtn = page.getByRole('button', { name: /Kirim Link Reset|Send Reset Link/i });
    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    await submitBtn.click();

    // 5. Verify success message is shown
    const successMsg = page.getByText(/Jika email Anda terdaftar|link untuk mereset/i);
    await expect(successMsg).toBeVisible({ timeout: 20000 });
  });
});
