import { test, expect } from './fixtures';
import { getTenantUrl } from './test_helper';

test.describe('DashboardLayout Authentication Redirection', () => {
  test('should redirect unauthenticated users accessing /attendance to /login', async ({ page }) => {
    // Go to the protected attendance page directly
    const url = getTenantUrl('/en/attendance');
    await page.goto(url);

    // Should immediately detect no session and redirect to /login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should redirect unauthenticated users accessing /profile to /login', async ({ page }) => {
    // Go to the protected profile page directly
    const url = getTenantUrl('/en/profile');
    await page.goto(url);

    // Should immediately detect no session and redirect to /login
    await expect(page).toHaveURL(/.*\/login/);
  });
});
