import { test, expect, Page } from '@playwright/test';

/**
 * Shared Test Helper for Integrated Frontend E2E Tests.
 * These helpers assume a real backend is running and seeded with data from 
 * backend/scripts/seed_test_db.py.
 */

export const TEST_USERS = {
  admin: {
    email: 'admin@company1.com',
    password: 'password123',
    nik: 'ADM001',
    fullname: 'Admin One',
  },
  manager: {
    email: 'manager1@company1.com',
    password: 'password123',
    nik: 'MGR001',
    fullname: 'Manager One',
  },
  employee: {
    email: 'employee1@company1.com',
    password: 'password123',
    nik: 'EMP001',
    fullname: 'Employee One',
  },
  admin_company2: {
    email: 'admin@company2.com',
    password: 'password123',
    nik: 'ADM002',
    fullname: 'Admin Two',
  }
};

export const BASE_URL = 'http://127.0.0.1:3000';
export const DEFAULT_TENANT = 'company1';

/**
 * Navigates to the login page and performs a full login flow.
 */
export async function login(page: Page, email: string, password = 'password123', tenant = DEFAULT_TENANT) {
  // 1. First, navigate to the base URL to ensure we are in the correct origin context
  // This allows us to set sessionStorage before the full login page loads
  await page.goto(`${BASE_URL}/en/login/portal-admin?test_tenant=${tenant}`);
  
  // 2. Explicitly set the test_tenant_e2e in sessionStorage to prevent race conditions
  await page.evaluate((t) => {
    if (t === 'public') {
      sessionStorage.removeItem('test_tenant_e2e');
    } else {
      sessionStorage.setItem('test_tenant_e2e', t);
    }
  }, tenant);

  // 3. Perform login as usual
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for the dashboard/sidebar to be visible
  await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });
  
  // Wait for network to settle to avoid race conditions in subsequent steps
  await page.waitForLoadState('networkidle');
  
  console.log(`--- Login successful for ${email} ---`);
}

/**
 * Performs a logout flow from the settings page.
 */
export async function logout(page: Page) {
  await page.goto(`${BASE_URL}/en/settings`);
  
  const logoutBtn = page.getByRole('button', { name: /Logout|Sign Out/i });
  await expect(logoutBtn).toBeVisible({ timeout: 10000 });
  await logoutBtn.click();
  
  // Confirm logout if there's a modal
  const confirmBtn = page.getByRole('button', { name: /Confirm/i });
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
  }
  
  await expect(page).toHaveURL(/.*\/login/);
  console.log('--- Logout successful ---');
}

/**
 * Helper to construct a tenant-specific URL.
 */
export function getTenantUrl(path: string, tenant = DEFAULT_TENANT) {
  const separator = path.includes('?') ? '&' : '?';
  return `${BASE_URL}${path}${separator}test_tenant=${tenant}`;
}
