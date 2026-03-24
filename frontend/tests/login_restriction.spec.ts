import { test, expect } from '@playwright/test';

test.describe('Login Access Restrictions', () => {
  const publicUrl = 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users/me', async route => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Not authenticated' }) });
    });
    await page.route('**/api/tenant/settings', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ name: 'Public', is_public: true }) });
    });
  });

  test('should hide login form and show notice on public domain', async ({ page }) => {
    // Navigate explicitly to public domain root
    await page.goto(`${publicUrl}/login`);

    // Verify restricted access message is visible
    await expect(page.getByText(/Restricted Access/i)).toBeVisible({ timeout: 15000 });
    
    // Verify email field is NOT visible
    await expect(page.locator('input[type="email"]')).not.toBeVisible();
    
    // Verify registration link is present
    await expect(page.getByText(/Register New Company/i)).toBeVisible();
  });

  test('should show login form on secret portal route even on public domain', async ({ page }) => {
    // Navigate to the secret portal route
    await page.goto(`${publicUrl}/login/portal-admin`);

    // Verify "Portal Admin Global" badge is visible
    await expect(page.getByText(/Global Admin Portal/i)).toBeVisible({ timeout: 15000 });
    
    // Verify login form is now visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
    
    // Verify restriction message is NOT visible
    await expect(page.getByText(/Restricted Access/i)).not.toBeVisible();
  });

  test('should redirect unauthenticated public visitors to /signup from root', async ({ page }) => {
    // Navigate to root
    await page.goto(`${publicUrl}/`);

    // Should be redirected to /signup (with locale prefix)
    await expect(page).toHaveURL(/.*\/signup/);
    await expect(page.getByText(/Create your account/i)).toBeVisible({ timeout: 15000 });
  });
});
