import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('Audit Logs Navigation', () => {
  const admin = TEST_USERS.admin;

  test('Admin can access Audit Logs page via Settings navigation', async ({ page }) => {
    await login(page, admin.email, admin.password);
    // Navigate to Settings > Audit Logs
    await page.goto(getTenantUrl('/id/settings/audit-logs'));
    // Verify page contains expected header
    const header = page.getByRole('heading', { name: /Log Audit Sistem/i });
    await expect(header).toBeVisible({ timeout: 15000 });
  });
});
