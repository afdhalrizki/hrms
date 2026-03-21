import { test, expect } from '@playwright/test';

test.describe('Branding and Identity', () => {
  const adminUrl = 'http://company1.localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Login as Tenant Admin
    await page.goto(`${adminUrl}/login`);
    await page.locator('input[type="email"]').fill('admin@company1.net');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
  });

  test('should update company branding and apply theme instantly', async ({ page }) => {
    // Navigate to Branding Settings
    await page.goto(`${adminUrl}/settings/branding`);

    // Verify existing title
    await expect(page.getByText(/Tenant Branding/i)).toBeVisible();

    // Change Primary Color to Red (#ff0000)
    const colorInput = page.locator('input[type="color"]').first();
    await colorInput.fill('#ff0000');
    
    // Submit
    await page.getByRole('button', { name: /Apply Changes/i }).click();

    // Verify Success Toast
    await expect(page.getByText(/Branding updated successfully/i)).toBeVisible();

    // Verify CSS injection: check if the "Action Button" in preview (or real sidebar) is red
    // We can check computed style of a primary-button
    const sidebarLogo = page.locator('.h-10.w-10.rounded-xl'); // Sidebar logo container
    await expect(sidebarLogo).toBeVisible();
    
    // Optionally check if :root variable updated (advanced)
    const rootStyle = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary');
    });
    expect(rootStyle.trim()).toBe('#ff0000');
  });
});
