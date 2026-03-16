import { test, expect } from '@playwright/test';

test.describe('Login Access Restrictions', () => {
  test('should hide login form and show notice on public domain', async ({ page }) => {
    // Navigate to the main login page on public domain
    await page.goto('/login');

    // Verify "Akses Terbatas" message is visible
    await expect(page.getByText('Akses Terbatas')).toBeVisible();
    
    // Verify email field is NOT visible
    await expect(page.locator('input[type="email"]')).not.toBeVisible();
    
    // Verify "Daftarkan Perusahaan Baru" link is present
    await expect(page.getByText('Daftarkan Perusahaan Baru')).toBeVisible();
  });

  test('should show login form on secret portal route even on public domain', async ({ page }) => {
    // Navigate to the secret portal route
    await page.goto('/login/portal-admin');

    // Verify "Portal Admin Global" badge is visible
    await expect(page.getByText('Portal Admin Global')).toBeVisible();
    
    // Verify login form is now visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
    
    // Verify "Akses Terbatas" is NOT visible
    await expect(page.getByText('Akses Terbatas')).not.toBeVisible();
  });

  test('should redirect unauthenticated public visitors to /signup from root', async ({ page }) => {
    // Navigate to root
    await page.goto('/');

    // Should be redirected to /signup
    await expect(page).toHaveURL('/signup');
    await expect(page.getByText('Create your account')).toBeVisible();
  });
});
