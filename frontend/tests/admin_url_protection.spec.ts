import { test, expect } from './fixtures';

test.describe('Admin Portal URL Protection E2E', () => {
  test('Default /admin/ path should be inaccessible when custom ADMIN_URL is set', async ({ page }) => {
    console.log('--- E2E: Testing that default /admin/ is protected or disabled ---');
    
    const response = await page.goto('http://localhost:8000/admin/');
    
    // If ADMIN_URL environment variable is set and customized, the default path must return 404
    const adminUrlPath = process.env.ADMIN_URL;
    if (adminUrlPath && adminUrlPath !== 'admin/' && adminUrlPath !== 'admin') {
      expect(response?.status()).toBe(404);
    } else {
      console.log('Skipping default 404 check as custom ADMIN_URL is not active in this test runner instance.');
    }
  });

  test('Active ADMIN_URL should render the Django Admin Portal', async ({ page }) => {
    const adminUrlPath = process.env.ADMIN_URL || 'admin/';
    console.log(`--- E2E: Testing active ADMIN_URL path: /${adminUrlPath} ---`);

    const response = await page.goto(`http://localhost:8000/${adminUrlPath}`);
    
    // The active admin path must be accessible (HTTP 200 OK)
    expect(response?.status()).toBe(200);
    
    // It must serve the Django Admin login page
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Django');
  });
});
