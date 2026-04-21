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

export const BASE_URL = 'http://127.0.0.1:3001';
export const DEFAULT_TENANT = 'company1';

/**
 * Navigates to the login page and performs a full login flow.
 */
export async function login(page: Page, email: string, password = 'password123', tenant = DEFAULT_TENANT) {
  // Debug: Log all browser console messages
  page.on('console', msg => {
    console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
  });

  page.on('request', request => {
    if (request.url().includes('/api/') && process.env.NODE_ENV === 'test') {
      console.log(`REQ [${request.method()}]: ${request.url()}`);
    }
  });

  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    // Ignore expected 401 on initial session check for users/me
    if (url.includes('/api/') && status >= 400) {
      if (status === 401 && url.includes('/api/users/me/')) return;
      console.log(`RES [${status}]: ${url}`);
    }
  });

  page.on('requestfailed', request => {
    const errorText = request.failure()?.errorText;
    const url = request.url();
    // Silence aborted requests and Next.js internal RSC requests to reduce noise
    if (errorText !== 'net::ERR_ABORTED' && !url.includes('_rsc=')) {
      console.log(`REQ FAILED: ${url} - ${errorText}`);
    }
  });
  
  page.on('pageerror', err => {
    console.error(`BROWSER ERROR: ${err.message}`);
  });

  // 1. First, navigate to the base URL to ensure we are in the correct origin context
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  await page.goto(`${BASE_URL}/en/login/portal-admin?test_tenant=${tenant}`);
  
  // Wait for the form to be ready to ensure page is loaded
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });

  // 2. Persist tenant for subsequent API calls via X-Tenant header
  // Using addInitScript ensures it is set for every page load/navigation
  await page.context().addInitScript((t) => {
    sessionStorage.setItem('test_tenant_e2e', t);
  }, tenant);
  
  // Also set it immediately for the current page state
  await page.evaluate((t) => {
    sessionStorage.setItem('test_tenant_e2e', t);
  }, tenant);

  // 3. Perform login as usual
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  await page.click('button[type="submit"]');
  
  // Wait for the URL to change to the dashboard (any language)
  await page.waitForURL(/.*\/en|.*\/id/, { timeout: 20000 });
  
  // 4. Wait for the dashboard/sidebar to be visible
  try {
    await expect(page.locator('aside')).toBeVisible({ timeout: 30000 });
    console.log(`--- Login successful for ${email} ---`);
  } catch (e) {
    console.error(`--- Login failed for ${email}. Current URL: ${page.url()} ---`);
    await page.screenshot({ path: `login-fail-${email}.png`, fullPage: true });
    // Also log browser console errors
    throw e;
  }
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
export const getTenantUrl = (path: string, tenant: string = 'company1') => {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('test_tenant', tenant);
  return url.toString();
};
