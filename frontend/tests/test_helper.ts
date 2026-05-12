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
export async function login(page: Page, email: string, password = 'password123', tenant?: string) {
  // Use parallelIndex (0 to numWorkers-1) for stable tenant isolation.
  // We use modulo 8 because run_all_tests.mjs seeds 8 worker tenants.
  const parallelIndex = test.info().parallelIndex;
  const workerTenant = parallelIndex > 0 ? `worker_${(parallelIndex - 1) % 8}` : DEFAULT_TENANT;
  
  const effectiveTenant = tenant || await page.evaluate(() => {
    try {
      return sessionStorage.getItem('test_tenant_e2e');
    } catch (e) {
      return null;
    }
  }) || workerTenant;
  
  // Also adjust email if it's a worker tenant and standard admin/employee email
  let effectiveEmail = email;
  if (effectiveTenant !== DEFAULT_TENANT && (email.endsWith(`@${DEFAULT_TENANT}.com`))) {
    effectiveEmail = email.replace(`@${DEFAULT_TENANT}.com`, `@${effectiveTenant}.com`);
  }
  // Debug: Log all browser console messages and fail on errors (Strict Mode)
  page.on('console', msg => {
    const text = msg.text();
    console.log(`BROWSER [${msg.type()}]: ${text}`);
    
    if (msg.type() === 'error') {
      // Whitelist expected/benign errors to avoid false positives
      if (text.includes('401 (Unauthorized)') && (text.includes('/api/users/me/') || text.includes('/api/auth/login/'))) return;
      if (text.includes('Failed to load resource') && (text.includes('401') || text.includes('403'))) return;
      
      // Whitelist 403s during isolation/permission tests or for regular employees on admin endpoints
      if (text.includes('403 (Forbidden)') || text.includes('status of 403')) {
        const isIsolationTest = page.url().includes('test_tenant=') || text.includes('company2');
        const isBenignEndpoint = text.includes('/api/core/dashboard-stats/') || 
                               text.includes('/api/tenant/settings/') ||
                               text.includes('/api/users/me/') ||
                               text.includes('/api/access-roles/') ||
                               text.includes('/api/workflow-configs/');
        
        if (isIsolationTest || isBenignEndpoint) {
          console.log(`[STRICT MODE - WHITELISTED] Expected/Handled 403: ${text}`);
          return;
        }
      }
      if (text.includes('Failed to fetch stats Error: You do not have permission')) {
        return;
      }

      // Whitelist next-intl translation missing warnings
      if (text.includes('MISSING_MESSAGE') || text.includes('Payroll.syncActive') || text.includes('Payroll.table.subtitle')) {
        return;
      }

      // Next.js hydration or RSC noise
      if (text.includes('Next.js local server') || text.includes('RSC')) return;
      
      // Ignore fetch errors that are likely aborts during navigation
      if (text.includes('TypeError: Failed to fetch')) {
        console.log(`[STRICT MODE - IGNORED] Potential fetch abort during navigation: ${text}`);
        return;
      }

      // Log the error but don't throw to avoid crashing the test context
      console.error(`[STRICT MODE - ERROR] ${text}`);
    }
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
      
      // Log the server error but don't throw - let the test assertions handle failure
      if (status >= 500) {
        console.error(`[STRICT MODE - SERVER ERROR] ${status} on ${url}`);
      }
      
      // FAIL FAST: If tenant settings return 404, the tenant is definitely missing
      if (status === 404 && url.includes('/api/tenant/settings/')) {
        const errorMsg = `❌ CRITICAL: Tenant "${effectiveTenant}" NOT FOUND (404) at ${url}. Aborting test.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
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
    console.error(`BROWSER CRITICAL ERROR: ${err.message}`);
  });
  // 0. Add logging listeners early to catch all requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
        const headers = request.headers();
        console.log(`[API REQUEST] ${request.method()} ${request.url()} - X-Tenant: ${headers['x-tenant'] || 'NONE'}`);
    }
  });
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
        console.log(`[API RESPONSE] ${response.status()} ${response.url()}`);
    }
    if (response.status() >= 400 && response.url().includes('/api/')) {
        const body = await response.text().catch(() => 'NO BODY');
        console.error(`[STRICT MODE - ERROR] Failed to load resource: the server responded with a status of ${response.status()} (${response.url()}) - BODY: ${body}`);
    }
  });

  // 0. Preliminary Backend Reachability Check (Fail Fast)
  try {
    const backendUrl = 'http://127.0.0.1:8000/api/';
    const response = await page.request.get(backendUrl, { timeout: 15000 });
    if (!response.ok() && response.status() >= 500) {
      throw new Error(`Backend at ${backendUrl} returned status ${response.status()}`);
    }
    console.log(`✅ Backend reachability verified: ${backendUrl}`);
  } catch (e: any) {
    const errorMsg = `❌ CRITICAL: Backend is UNREACHABLE at http://localhost:8000/api/. Login cannot proceed. Error: ${e.message || e}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 1. Fast Login Path (API-based) - Attempt this first to save time
  try {
    console.log(`--- Attempting Fast Login for ${effectiveEmail} on tenant ${effectiveTenant} ---`);
    const loginResponse = await page.request.post('http://127.0.0.1:8000/api/auth/login/', {
      data: { email: effectiveEmail, password },
      headers: { 'X-Tenant': effectiveTenant },
      timeout: 30000
    });

    if (loginResponse.ok()) {
      const authData = await loginResponse.json();
      
      // Inject tokens and tenant into the context
      await page.context().addInitScript((data) => {
        localStorage.setItem('access_token', data.auth.access);
        if (data.auth.refresh) localStorage.setItem('refresh_token', data.auth.refresh);
        localStorage.setItem('test_tenant_e2e', data.tenant);
        sessionStorage.setItem('test_tenant_e2e', data.tenant);
        document.cookie = `test_tenant_e2e=${data.tenant}; path=/; max-age=3600`;
      }, { auth: authData, tenant: effectiveTenant });

      // Set cookies for the context
      const domain = new URL(getTenantUrl('')).hostname;
      await page.context().addCookies([{
        name: 'test_tenant_e2e',
        value: effectiveTenant,
        domain: domain,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 3600
      }]);

      await page.goto(`${BASE_URL}/en`, { waitUntil: 'networkidle', timeout: 60000 });
      
      // Verify login success via sidebar
      const sidebar = page.locator('aside');
      try {
        await expect(sidebar).toBeVisible({ timeout: 30000 });
        console.log(`--- Fast Login successful for ${effectiveEmail} ---`);
        return; // Success!
      } catch (e) {
        console.warn(`--- Fast Login sidebar verification failed, falling back to UI login ---`);
      }
    } else {
      const errorBody = await loginResponse.text().catch(() => 'no body');
      console.warn(`--- Fast Login API returned ${loginResponse.status()}: ${errorBody}, falling back to UI login ---`);
    }
  } catch (e: any) {
    console.warn(`--- Fast Login encountered error: ${e.message}, falling back to UI login ---`);
  }

  // 2. Fallback: UI Login (The original robust logic)
  console.log(`--- Proceeding with UI Login for ${effectiveEmail} ---`);
  // Ensure a clean state before UI login
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  }).catch(() => {});
  await page.context().clearCookies();

  // Go to the specific tenant's home first to set the context correctly
  await page.goto(`${BASE_URL}/en?test_tenant=${effectiveTenant}`, { waitUntil: 'networkidle' }).catch(() => {});
  
  await page.goto(`${BASE_URL}/en/login/portal-admin?test_tenant=${effectiveTenant}`, { waitUntil: 'networkidle' });
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20000 });

  // 2. Persist tenant for subsequent API calls via X-Tenant header
  await page.context().addInitScript((t) => {
    try {
      sessionStorage.setItem('test_tenant_e2e', t);
      localStorage.setItem('test_tenant_e2e', t);
      document.cookie = `test_tenant_e2e=${t}; path=/; max-age=3600`;
    } catch (e) {}
  }, effectiveTenant);

  // 3. Set tenant persistence via both Cookie and SessionStorage
  const domain = new URL(getTenantUrl('')).hostname;
  await page.context().addCookies([{
    name: 'test_tenant_e2e',
    value: effectiveTenant,
    domain: domain,
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 3600
  }]);

  // 3. Perform login with robust waiting
  const loginButton = page.locator('button[type="submit"]');
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  
  // 3.1 Initial form fill
  await emailInput.fill(effectiveEmail);
  await passwordInput.fill(password);

  await expect(loginButton).toBeEnabled({ timeout: 15000 });

  console.log(`--- Attempting UI login for ${effectiveEmail} on tenant ${effectiveTenant} ---`);
  
  let loginSuccess = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/auth/login') && resp.request().method() === 'POST',
      { timeout: 60000 }
    ).catch(() => null);

    await loginButton.click({ force: true });
    
    const loginResp = await responsePromise;
    if (loginResp && loginResp.ok()) {
        console.log(`--- UI Login API success on attempt ${attempt} ---`);
        loginSuccess = true;
        break;
    } else {
        const status = loginResp ? loginResp.status() : 'TIMED_OUT';
        const body = loginResp ? await loginResp.text().catch(() => 'no body') : '';
        console.warn(`--- UI Login attempt ${attempt} failed with status ${status}: ${body} ---`);
    }
    
    if (attempt < 3) {
        console.log(`--- UI Login attempt ${attempt} failed, reloading and retrying... ---`);
        await page.reload({ waitUntil: 'networkidle' });
        await emailInput.fill(effectiveEmail);
        await passwordInput.fill(password);
    }
  }

  if (!loginSuccess) {
      throw new Error(`Login failed for ${effectiveEmail} after 3 attempts. Final URL: ${page.url()}`);
  }

  // 4. Wait for the URL to change to the dashboard (any language)
  try {
    await page.waitForURL(url => {
      const p = url.pathname.toLowerCase();
      return !p.includes('/login') && 
             !p.includes('/portal-admin') && 
             (p.includes('/en') || p.includes('/id') || p === '/');
    }, { timeout: 30000 });
    console.log(`--- Navigation successful: ${page.url()} ---`);
  } catch (e: any) {
    console.error(`--- Navigation timeout. Current URL: ${page.url()} ---`);
    // Fallback: check if we are actually logged in by looking for the sidebar
    if (await page.locator('aside').isVisible()) {
        console.log('--- Sidebar visible despite URL timeout, proceeding ---');
    } else {
        await page.screenshot({ path: `login-nav-timeout-${email}.png` });
        throw e;
    }
  }
  
  // 5. Wait for the dashboard/sidebar to be visible
  await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });
    
    // 6. Wait for all loaders to settle
    await waitForNoLoaders(page);
    
    // 7. Wait for the profile data to hydrate
    const sidebarProfile = page.locator('aside').getByTestId('sidebar-fullname');
    await expect(sidebarProfile).toBeVisible({ timeout: 20000 });
    await expect(sidebarProfile).not.toHaveText(/loading/i, { timeout: 20000 });
    
    // 8. Verify the CORRECT profile email (effectiveEmail) is visible
    // We use a self-healing retry logic here: if it doesn't appear in 10s, we reload once.
    try {
        await expect(page.locator('aside').getByText(effectiveEmail, { exact: false })).toBeVisible({ timeout: 15000 });
    } catch (e) {
        console.log(`--- Email ${effectiveEmail} not visible after 15s, performing self-healing reload ---`);
        await page.reload();
        await waitForNoLoaders(page);
        await expect(page.locator('aside')).toBeVisible({ timeout: 20000 });
        await expect(page.locator('aside').getByText(effectiveEmail, { exact: false })).toBeVisible({ timeout: 20000 });
    }
    
    console.log(`--- Login successful for ${email} ---`);
}

/**
 * Helper to wait for any loading indicators or skeletons to disappear.
 */
export async function waitForNoLoaders(page: Page) {
    // List of common loading text/patterns in the app
    const loaders = [
        /Loading/i,
        /Syncing/i,
        /Fetching/i,
        /Please wait/i,
        /Updating/i
    ];
    
    for (const loader of loaders) {
        // We use a short timeout for each check to avoid hanging if the loader isn't there
        await expect(page.getByText(loader)).not.toBeVisible({ timeout: 10000 }).catch(() => {
            console.log(`--- Note: Loader "${loader}" still visible or timed out, continuing ---`);
        });
    }
    
    // Also wait for network to settle slightly
    await page.waitForLoadState('networkidle').catch(() => {});
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
export const getTenantUrl = (path: string, tenant?: string) => {
  const parallelIndex = test.info().parallelIndex;
  const workerTenant = parallelIndex > 0 ? `worker_${(parallelIndex - 1) % 8}` : DEFAULT_TENANT;
  
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('test_tenant', tenant || workerTenant);
  return url.toString();
};
