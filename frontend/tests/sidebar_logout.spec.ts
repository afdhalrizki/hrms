import { test, expect } from './fixtures';
import { login } from './test_helper';

test.describe('Sidebar Logout Interaction', () => {
  test('should successfully clear session and redirect to login on click', async ({ page }) => {
    // 1. Perform absolute login to the application
    console.log('Logging in for logout E2E test...');
    await login(page, 'admin@company1.com');
    
    // 2. Ensure dashboard and sidebar are fully rendered
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 15000 });
    
    // 3. Verify that the Logout button is present
    const logoutBtn = page.locator('button[title="Logout"]');
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    
    // 4. Perform visual hover and click interaction on the button
    console.log('Clicking sidebar logout button...');
    await logoutBtn.hover();
    await logoutBtn.click();
    
    // 5. Verify redirection back to the login page
    console.log('Verifying redirection to /login...');
    await expect(page).toHaveURL(/.*\/login/, { timeout: 20000 });
    
    console.log('✅ Sidebar logout E2E test passed successfully!');
  });
});
