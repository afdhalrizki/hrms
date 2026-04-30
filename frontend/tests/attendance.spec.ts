import { test, expect } from './fixtures';
import { login, TEST_USERS, getTenantUrl } from './test_helper';

test.describe('Attendance Management', () => {
  const employee = TEST_USERS.employee;

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `attendance-failure.png`, fullPage: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Perform real login as employee1
    await login(page, employee.email, employee.password);
  });

  test.beforeEach(async ({ page }) => {
    // Mock Geolocation API
    await page.addInitScript(() => {
      const mockGeolocation = {
        getCurrentPosition: (success: any) => {
          success({
            coords: {
              latitude: -6.2088,
              longitude: 106.8456,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          });
        },
        watchPosition: () => 0,
        clearWatch: () => {},
      };
      // @ts-ignore
      navigator.geolocation = mockGeolocation;
    });

    // Log all API requests/responses for debugging
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`>> [API REQ] ${request.method()} ${request.url()}`);
      }
    });
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`<< [API RES] ${response.status()} ${response.url()}`);
      }
    });
  });

  test('should verify attendance dashboard and perform check-out', async ({ page }) => {
    // 1. Verify Stats from real backend
    // Go to attendance page with tenant context
    await page.goto(getTenantUrl('/en/attendance'));
    
    // Wait for the main heading to be sure we are on the right page
    await expect(page.getByRole('heading', { name: /Attendance Management/i })).toBeVisible({ timeout: 15000 });
    
    // We wait for the specific KPI to contain a non-zero or expected value if needed, 
    // but at minimum we wait for the card to be visible.
    // Use toPass to wait for data fetch to complete and UI to update
    await expect(async () => {
      // Check for loader first
      await expect(page.getByText(/Loading attendance data/i)).not.toBeVisible({ timeout: 5000 });
      
      const successRateKpi = page.getByText(/SUCCESS RATE|Success Rate/i);
      await expect(successRateKpi).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
    
    // Wait for any pending attendance fetch to settle 
    await page.waitForResponse(resp => resp.url().includes('/api/attendance') && resp.status() === 200, { timeout: 10000 }).catch(() => {});
    
    // 2. Perform Check Out 
    console.log('--- Waiting for page hydration ---');
    await page.waitForLoadState('networkidle');
    
    console.log('--- Checking Out ---');
    const clockBtn = page.getByTestId('clock-btn');
    
    // Wait for button to be visible AND enabled (not processing/mobile-restricted)
    await expect(clockBtn).toBeVisible({ timeout: 15000 });
    await expect(async () => {
      const isDisabled = await clockBtn.isDisabled();
      if (isDisabled) throw new Error('Clock button is still disabled');
    }).toPass({ timeout: 10000 });

    console.log('--- Mocking Geolocation in page ---');
    await page.evaluate(() => {
      // @ts-ignore
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: { latitude: -6.2088, longitude: 106.8456, accuracy: 10 },
          timestamp: Date.now(),
        });
      };
    });

    console.log('--- Clicking Clock Button ---');
    // Listen for the attendance API call (either POST for check-in or PATCH for check-out)
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/attendance') && (resp.status() === 200 || resp.status() === 201),
      { timeout: 30000 }
    );
    
    await clockBtn.click();
    
    console.log('--- Waiting for API response ---');
    await apiPromise;
    
    console.log('--- Waiting for success toast ---');
    // Verify success toast from real backend - target the toast container specifically to avoid strict mode violation
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toBeVisible({ timeout: 15000 });
    await expect(toast).toContainText(/recorded|successfully|out/i);
  });

  test('should allow employee to submit a correction request', async ({ page }) => {
    await page.goto(getTenantUrl('/en/attendance'));
    await page.waitForLoadState('networkidle');

    // 1. Open Correction Modal
    const requestCorrectionBtn = page.getByRole('button', { name: /Request Correction/i }).first();
    await expect(requestCorrectionBtn).toBeVisible({ timeout: 10000 });
    await requestCorrectionBtn.click();
    
    await expect(page.getByRole('heading', { name: /Request Correction/i })).toBeVisible();
    
    // 2. Fill form
    await page.locator('textarea').fill('Integrated test correction request: Forgot to check out yesterday.');
    
    // 3. Submit
    const submitBtn = page.getByRole('button', { name: /Submit Request/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      // Fallback if the button text is different or in a form
      await page.locator('form').evaluate(node => (node as HTMLFormElement).requestSubmit());
    }
    
    // 4. Verify success from real backend
    await expect(page.getByText(/Correction request submitted successfully!/i)).toBeVisible({ timeout: 15000 });
  });
});
